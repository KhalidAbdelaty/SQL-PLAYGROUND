import jwt
import bcrypt
from datetime import datetime, timedelta
from typing import Optional, Dict, Tuple
import secrets
import logging
from app.auth.database import auth_db
from app.auth.models import UserCreate, UserResponse, SessionResponse
from app.services.provisioner import provisioner
import config

logger = logging.getLogger(__name__)

# JWT settings
JWT_SECRET = config.JWT_SECRET
JWT_ALGORITHM = "HS256"
SESSION_DURATION_HOURS = 8


class AuthService:
    """Handles user authentication, session management, and provisioning"""
    
    def __init__(self):
        self.setup_key = config.ADMIN_SETUP_KEY
    
    def hash_password(self, password: str) -> str:
        """Hash a password using bcrypt"""
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def verify_password(self, password: str, hashed: str) -> bool:
        """Verify a password against its hash"""
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    
    def generate_session_id(self) -> str:
        """Generate a unique session ID"""
        return secrets.token_urlsafe(32)
    
    def create_jwt_token(self, user_id: int, session_id: str) -> str:
        """Create a JWT token"""
        payload = {
            "user_id": user_id,
            "session_id": session_id,
            "iat": datetime.utcnow(),
            "exp": datetime.utcnow() + timedelta(hours=SESSION_DURATION_HOURS)
        }
        return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    def verify_jwt_token(self, token: str) -> Optional[Dict]:
        """Verify and decode a JWT token"""
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("Token expired")
            return None
        except jwt.InvalidTokenError:
            logger.warning("Invalid token")
            return None
    
    async def setup_first_admin(self, username: str, password: str, confirm_password: str, setup_key: str) -> SessionResponse:
        """
        Create the first admin user (only works if no admin exists)
        
        Args:
            username: Admin username
            password: Admin password
            confirm_password: Password confirmation
            setup_key: Special setup key from config
            
        Returns:
            SessionResponse with token and user info
        """
        # Verify setup key
        if setup_key != self.setup_key:
            raise ValueError("Invalid setup key")
        
        # Check if admin already exists
        if auth_db.check_admin_exists():
            raise ValueError("Admin user already exists. Use login instead.")
        
        # Validate passwords match
        if password != confirm_password:
            raise ValueError("Passwords do not match")
        
        # Validate password length
        if len(password) < 8:
            raise ValueError("Password must be at least 8 characters")
        
        # Create admin user
        password_hash = self.hash_password(password)
        user_id = auth_db.create_user(username, password_hash, "admin")
        
        # Log event
        auth_db.log_auth_event(user_id, "admin_created", f"First admin user: {username}")
        
        # Create session
        session_id = self.generate_session_id()
        token = self.create_jwt_token(user_id, session_id)
        expires_at = datetime.utcnow() + timedelta(hours=SESSION_DURATION_HOURS)
        
        auth_db.create_session(session_id, user_id, token, expires_at)
        auth_db.update_last_login(user_id)
        
        # Get user info
        user = auth_db.get_user_by_id(user_id)
        
        user_response = UserResponse(
            user_id=user['user_id'],
            username=user['username'],
            email=user['email'],
            role=user['role'],
            created_at=datetime.fromisoformat(user['created_at'])
        )
        
        return SessionResponse(
            token=token,
            user=user_response,
            expires_at=expires_at
        )
    
    async def login(self, username: str, password: str, ip_address: Optional[str] = None) -> SessionResponse:
        """
        Authenticate user and create session
        
        Args:
            username: User's username
            password: User's password
            ip_address: Client IP address for audit
            
        Returns:
            SessionResponse with token and user info
        """
        # Get user from database
        user = auth_db.get_user_by_username(username)
        
        if not user:
            auth_db.log_auth_event(None, "login_failed", f"Username not found: {username}", ip_address)
            raise ValueError("Invalid username or password")
        
        # Verify password
        if not self.verify_password(password, user['password_hash']):
            auth_db.log_auth_event(user['user_id'], "login_failed", "Invalid password", ip_address)
            raise ValueError("Invalid username or password")
        
        # Create session
        session_id = self.generate_session_id()
        token = self.create_jwt_token(user['user_id'], session_id)
        expires_at = datetime.utcnow() + timedelta(hours=SESSION_DURATION_HOURS)
        
        auth_db.create_session(session_id, user['user_id'], token, expires_at)
        auth_db.update_last_login(user['user_id'])
        auth_db.log_auth_event(user['user_id'], "login_success", None, ip_address)
        
        # Get sandbox info if user is sandbox type
        database_name = None
        sql_login = None
        if user['role'] == 'sandbox':
            sandbox = auth_db.get_sandbox_by_user_id(user['user_id'])
            if sandbox:
                database_name = sandbox['database_name']
                sql_login = sandbox['sql_login']
        
        user_response = UserResponse(
            user_id=user['user_id'],
            username=user['username'],
            email=user['email'],
            role=user['role'],
            created_at=datetime.fromisoformat(user['created_at']),
            database_name=database_name,
            sql_login=sql_login
        )
        
        return SessionResponse(
            token=token,
            user=user_response,
            expires_at=expires_at
        )
    
    async def register_sandbox_user(self, user_data: UserCreate, ip_address: Optional[str] = None) -> SessionResponse:
        """
        Register a new sandbox user and provision their environment
        
        Args:
            user_data: User registration data
            ip_address: Client IP address for audit
            
        Returns:
            SessionResponse with token and user info
        """
        # Validate password length
        if len(user_data.password) < 8:
            raise ValueError("Password must be at least 8 characters")
        
        # Check if username already exists
        existing_user = auth_db.get_user_by_username(user_data.username)
        if existing_user:
            raise ValueError("Username already exists")
        
        # Create user in auth database
        password_hash = self.hash_password(user_data.password)
        user_id = auth_db.create_user(
            username=user_data.username,
            password_hash=password_hash,
            role="sandbox",
            email=user_data.email
        )
        
        auth_db.log_auth_event(user_id, "user_registered", f"Sandbox user: {user_data.username}", ip_address)
        
        try:
            # Provision SQL Server sandbox environment
            logger.info(f"Provisioning sandbox for user: {user_data.username}")
            
            # Run synchronous provisioner in thread pool to avoid blocking
            import asyncio
            from concurrent.futures import ThreadPoolExecutor
            
            loop = asyncio.get_event_loop()
            executor = ThreadPoolExecutor(max_workers=1)
            
            try:
                database_name, sql_login, sql_password = await loop.run_in_executor(
                    executor,
                    provisioner.create_sandbox_environment,
                    user_data.username
                )
            except Exception as prov_error:
                logger.error(f"Provisioner failed: {str(prov_error)}")
                raise ValueError(f"Failed to create sandbox: {str(prov_error)}")
            finally:
                executor.shutdown(wait=False)
            
            # Record sandbox in database
            expires_at = datetime.utcnow() + timedelta(hours=SESSION_DURATION_HOURS)
            auth_db.create_sandbox_database(
                user_id=user_id,
                database_name=database_name,
                sql_login=sql_login,
                sql_password=sql_password,
                expires_at=expires_at,
                auto_cleanup=True
            )
            
            auth_db.log_auth_event(user_id, "sandbox_created", f"Database: {database_name}", ip_address)
            
            # Create session
            session_id = self.generate_session_id()
            token = self.create_jwt_token(user_id, session_id)
            
            auth_db.create_session(session_id, user_id, token, expires_at)
            auth_db.update_last_login(user_id)
            
            user_response = UserResponse(
                user_id=user_id,
                username=user_data.username,
                email=user_data.email,
                role="sandbox",
                created_at=datetime.utcnow(),
                database_name=database_name,
                sql_login=sql_login
            )
            
            return SessionResponse(
                token=token,
                user=user_response,
                expires_at=expires_at
            )
            
        except Exception as e:
            # Cleanup user if provisioning failed
            logger.error(f"Failed to provision sandbox, cleaning up user: {e}")
            auth_db.delete_user(user_id)
            auth_db.log_auth_event(user_id, "sandbox_failed", str(e), ip_address)
            raise Exception(f"Failed to create sandbox environment: {str(e)}")
    
    async def logout(self, session_id: str, cleanup: bool = True) -> bool:
        """
        Logout user and optionally cleanup sandbox
        
        Args:
            session_id: Session ID to terminate
            cleanup: Whether to cleanup sandbox database
            
        Returns:
            True if successful
        """
        session = auth_db.get_session(session_id)
        if not session:
            return False
        
        user_id = session['user_id']
        user = auth_db.get_user_by_id(user_id)
        
        # Delete session
        auth_db.delete_session(session_id)
        auth_db.log_auth_event(user_id, "logout", None)
        
        # Cleanup sandbox if requested and user is sandbox type
        if cleanup and user['role'] == 'sandbox':
            await self._cleanup_sandbox_user(user_id)
        
        return True
    
    async def _cleanup_sandbox_user(self, user_id: int) -> None:
        """
        Cleanup sandbox database and user account
        
        Args:
            user_id: User ID to cleanup
        """
        sandbox = auth_db.get_sandbox_by_user_id(user_id)
        if not sandbox:
            return
        
        try:
            # Drop SQL Server database and login
            provisioner.cleanup_sandbox_environment(
                database_name=sandbox['database_name'],
                sql_login=sandbox['sql_login']
            )
            
            # Remove records from auth database
            auth_db.delete_sandbox(sandbox['db_id'])
            auth_db.delete_user(user_id)
            
            auth_db.log_auth_event(user_id, "sandbox_cleaned", f"Database: {sandbox['database_name']}")
            logger.info(f"Cleaned up sandbox for user_id: {user_id}")
            
        except Exception as e:
            logger.error(f"Error cleaning up sandbox: {e}")
    
    async def extend_session(self, session_id: str, hours: int = 8) -> datetime:
        """
        Extend session expiration time

        Args:
            session_id: Session to extend
            hours: Number of hours to extend (max 24)

        Returns:
            New expiration datetime
        """
        if hours < 1 or hours > 24:
            raise ValueError("Extension must be between 1 and 24 hours")

        session = auth_db.get_session(session_id)
        if not session:
            raise ValueError("Session not found")

        # Add hours to the EXISTING expiry time, not to current time
        # This ensures that extending by 8 hours actually adds 8 hours to remaining time
        current_expires_at = datetime.fromisoformat(session['expires_at'])
        new_expires_at = current_expires_at + timedelta(hours=hours)
        auth_db.extend_session(session_id, new_expires_at)
        
        # Also extend sandbox if applicable
        user = auth_db.get_user_by_id(session['user_id'])
        if user['role'] == 'sandbox':
            sandbox = auth_db.get_sandbox_by_user_id(user['user_id'])
            if sandbox:
                with auth_db.get_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute(
                        "UPDATE sandbox_databases SET expires_at = ? WHERE db_id = ?",
                        (new_expires_at.isoformat(), sandbox['db_id'])
                    )
                    conn.commit()
        
        auth_db.log_auth_event(session['user_id'], "session_extended", f"Extended by {hours} hours")
        
        return new_expires_at
    
    def validate_session(self, session_id: str) -> Optional[Dict]:
        """
        Validate session and return user info
        
        Args:
            session_id: Session ID to validate
            
        Returns:
            User dict if valid, None otherwise
        """
        session = auth_db.get_session(session_id)
        if not session:
            return None
        
        # Check expiration
        expires_at = datetime.fromisoformat(session['expires_at'])
        if datetime.utcnow() > expires_at:
            auth_db.delete_session(session_id)
            return None
        
        # Update activity
        auth_db.update_session_activity(session_id)
        
        # Get user
        user = auth_db.get_user_by_id(session['user_id'])
        return user
    
    def get_user_connection_string(self, user_id: int) -> str:
        """
        Get SQL Server connection string for a user
        
        Args:
            user_id: User ID
            
        Returns:
            Connection string
        """
        user = auth_db.get_user_by_id(user_id)
        
        if user['role'] == 'admin':
            # Admin uses Windows auth
            return config.CONNECTION_STRING
        else:
            # Sandbox user uses their dedicated credentials
            sandbox = auth_db.get_sandbox_by_user_id(user_id)
            if not sandbox:
                raise ValueError("Sandbox not found for user")
            
            return (
                f"DRIVER={{{config.DB_DRIVER}}};"
                f"SERVER={config.DB_SERVER};"
                f"DATABASE={sandbox['database_name']};"
                f"UID={sandbox['sql_login']};"
                f"PWD={sandbox['sql_password']};"
            )


# Global instance
auth_service = AuthService()