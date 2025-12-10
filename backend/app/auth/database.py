import sqlite3
from pathlib import Path
from contextlib import contextmanager
from typing import Optional, Dict, List
import logging

logger = logging.getLogger(__name__)

# Database path
AUTH_DB_PATH = Path(__file__).resolve().parent.parent.parent / "auth.db"


class AuthDatabase:
    """Manages SQLite database for user authentication"""
    
    def __init__(self):
        self.db_path = AUTH_DB_PATH
        self._initialize_database()
    
    def _initialize_database(self):
        """Create database and tables if they don't exist"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Users table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT,
                    password_hash TEXT NOT NULL,
                    role TEXT NOT NULL DEFAULT 'sandbox',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_login TIMESTAMP
                )
            """)
            
            # Sessions table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sessions (
                    session_id TEXT PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    token TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP NOT NULL,
                    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(user_id)
                )
            """)
            
            # Sandbox databases table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sandbox_databases (
                    db_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    database_name TEXT UNIQUE NOT NULL,
                    sql_login TEXT UNIQUE NOT NULL,
                    sql_password TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP NOT NULL,
                    auto_cleanup BOOLEAN DEFAULT 1,
                    FOREIGN KEY (user_id) REFERENCES users(user_id)
                )
            """)
            
            # Audit log for auth events
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS auth_audit (
                    audit_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    event_type TEXT NOT NULL,
                    event_data TEXT,
                    ip_address TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            conn.commit()
            logger.info(f"Auth database initialized at {self.db_path}")
    
    @contextmanager
    def get_connection(self):
        """Context manager for database connections"""
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row  # Enable column access by name
        try:
            yield conn
        except Exception as e:
            conn.rollback()
            logger.error(f"Database error: {e}")
            raise
        finally:
            conn.close()
    
    def check_admin_exists(self) -> bool:
        """Check if any admin user exists"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) as count FROM users WHERE role = 'admin'")
            result = cursor.fetchone()
            return result['count'] > 0
    
    def create_user(self, username: str, password_hash: str, role: str, email: Optional[str] = None) -> int:
        """Create a new user"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO users (username, password_hash, role, email) VALUES (?, ?, ?, ?)",
                (username, password_hash, role, email)
            )
            conn.commit()
            return cursor.lastrowid
    
    def get_user_by_username(self, username: str) -> Optional[Dict]:
        """Get user by username"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
            row = cursor.fetchone()
            return dict(row) if row else None
    
    def get_user_by_id(self, user_id: int) -> Optional[Dict]:
        """Get user by ID"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
            row = cursor.fetchone()
            return dict(row) if row else None
    
    def update_last_login(self, user_id: int):
        """Update user's last login timestamp"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?",
                (user_id,)
            )
            conn.commit()
    
    def create_session(self, session_id: str, user_id: int, token: str, expires_at) -> None:
        """Create a new session"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO sessions (session_id, user_id, token, expires_at) VALUES (?, ?, ?, ?)",
                (session_id, user_id, token, expires_at.isoformat())
            )
            conn.commit()
    
    def get_session(self, session_id: str) -> Optional[Dict]:
        """Get session by ID"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM sessions WHERE session_id = ?", (session_id,))
            row = cursor.fetchone()
            return dict(row) if row else None
    
    def update_session_activity(self, session_id: str):
        """Update session last activity"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE sessions SET last_activity = CURRENT_TIMESTAMP WHERE session_id = ?",
                (session_id,)
            )
            conn.commit()
    
    def extend_session(self, session_id: str, new_expires_at) -> None:
        """Extend session expiration"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE sessions SET expires_at = ? WHERE session_id = ?",
                (new_expires_at.isoformat(), session_id)
            )
            conn.commit()
    
    def delete_session(self, session_id: str) -> None:
        """Delete a session"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM sessions WHERE session_id = ?", (session_id,))
            conn.commit()
    
    def create_sandbox_database(
        self, user_id: int, database_name: str, sql_login: str, 
        sql_password: str, expires_at, auto_cleanup: bool = True
    ) -> int:
        """Record a sandbox database"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """INSERT INTO sandbox_databases 
                (user_id, database_name, sql_login, sql_password, expires_at, auto_cleanup)
                VALUES (?, ?, ?, ?, ?, ?)""",
                (user_id, database_name, sql_login, sql_password, expires_at.isoformat(), auto_cleanup)
            )
            conn.commit()
            return cursor.lastrowid
    
    def get_sandbox_by_user_id(self, user_id: int) -> Optional[Dict]:
        """Get sandbox database info by user ID"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM sandbox_databases WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
                (user_id,)
            )
            row = cursor.fetchone()
            return dict(row) if row else None
    
    def get_expired_sandboxes(self) -> List[Dict]:
        """Get all expired sandbox databases"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """SELECT * FROM sandbox_databases 
                WHERE expires_at < datetime('now') AND auto_cleanup = 1"""
            )
            return [dict(row) for row in cursor.fetchall()]
    
    def delete_sandbox(self, db_id: int) -> None:
        """Delete sandbox database record"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM sandbox_databases WHERE db_id = ?", (db_id,))
            conn.commit()
    
    def delete_user(self, user_id: int) -> None:
        """Delete user and all related data"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            # Delete in order due to foreign keys
            cursor.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
            cursor.execute("DELETE FROM sandbox_databases WHERE user_id = ?", (user_id,))
            cursor.execute("DELETE FROM users WHERE user_id = ?", (user_id,))
            conn.commit()
    
    def log_auth_event(self, user_id: Optional[int], event_type: str, 
                       event_data: Optional[str] = None, ip_address: Optional[str] = None):
        """Log authentication event"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO auth_audit (user_id, event_type, event_data, ip_address) VALUES (?, ?, ?, ?)",
                (user_id, event_type, event_data, ip_address)
            )
            conn.commit()


# Global instance
auth_db = AuthDatabase()