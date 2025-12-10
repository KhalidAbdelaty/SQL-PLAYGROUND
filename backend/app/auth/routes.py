from fastapi import APIRouter, HTTPException, Request, Depends, Header
from fastapi.responses import JSONResponse
from typing import Optional
import logging
from app.auth import (
    auth_service,
    auth_db,
    UserCreate,
    UserLogin,
    AdminSetupRequest,
    SessionExtendRequest,
    CleanupRequest
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["authentication"])


def get_client_ip(request: Request) -> str:
    """Extract client IP address from request"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host


@router.get("/check-setup")
async def check_admin_setup():
    """
    Check if initial admin setup is required
    
    Returns:
        {"setup_required": bool, "admin_exists": bool}
    """
    admin_exists = auth_db.check_admin_exists()
    return {
        "setup_required": not admin_exists,
        "admin_exists": admin_exists
    }


@router.post("/setup-admin")
async def setup_admin(setup_data: AdminSetupRequest, request: Request):
    """
    Create the first admin user (only works once)
    
    Request body:
        {
            "username": "admin",
            "password": "password123",
            "confirm_password": "password123",
            "setup_key": "SETUP_KEY_FROM_ENV"
        }
    
    Returns:
        Session data with JWT token
    """
    try:
        ip_address = get_client_ip(request)
        
        session_response = await auth_service.setup_first_admin(
            username=setup_data.username,
            password=setup_data.password,
            confirm_password=setup_data.confirm_password,
            setup_key=setup_data.setup_key
        )
        
        return session_response
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Admin setup error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create admin user")


@router.post("/login")
async def login(credentials: UserLogin, request: Request):
    """
    Login user (admin or sandbox)
    
    Request body:
        {
            "username": "john_doe",
            "password": "password123"
        }
    
    Returns:
        Session data with JWT token and user info
    """
    try:
        ip_address = get_client_ip(request)
        
        session_response = await auth_service.login(
            username=credentials.username,
            password=credentials.password,
            ip_address=ip_address
        )
        
        return session_response
        
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Login failed")


@router.post("/register-sandbox")
async def register_sandbox(user_data: UserCreate, request: Request):
    """
    Register new sandbox user and provision database
    
    Request body:
        {
            "username": "john_doe",
            "email": "john@example.com",
            "password": "password123"
        }
    
    Returns:
        Session data with JWT token, user info, and sandbox database details
    """
    try:
        ip_address = get_client_ip(request)
        
        # Force role to sandbox
        user_data.role = "sandbox"
        
        session_response = await auth_service.register_sandbox_user(
            user_data=user_data,
            ip_address=ip_address
        )
        
        return session_response
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Sandbox registration error: {e}", exc_info=True)
        error_msg = str(e) if str(e) else "Failed to create sandbox account"
        raise HTTPException(status_code=500, detail=error_msg)


@router.post("/logout")
async def logout(cleanup_req: CleanupRequest, authorization: Optional[str] = Header(None)):
    """
    Logout user and optionally cleanup sandbox
    
    Request body:
        {
            "cleanup": true,  # Whether to delete sandbox database
            "session_id": "session-id-here"
        }
    
    Returns:
        {"success": true, "message": "..."}
    """
    try:
        # Extract session_id from token or request body
        session_id = cleanup_req.session_id
        
        if not session_id and authorization:
            # Try to extract from JWT token
            token = authorization.replace("Bearer ", "")
            payload = auth_service.verify_jwt_token(token)
            if payload:
                session_id = payload.get("session_id")
        
        if not session_id:
            raise HTTPException(status_code=400, detail="Session ID required")
        
        success = await auth_service.logout(
            session_id=session_id,
            cleanup=cleanup_req.cleanup
        )
        
        if success:
            message = "Logged out successfully"
            if cleanup_req.cleanup:
                message += " and sandbox cleaned up"
            return {"success": True, "message": message}
        else:
            raise HTTPException(status_code=404, detail="Session not found")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Logout error: {e}")
        raise HTTPException(status_code=500, detail="Logout failed")


@router.post("/extend-session")
async def extend_session(extend_req: SessionExtendRequest, authorization: Optional[str] = Header(None)):
    """
    Extend session expiration time
    
    Request body:
        {
            "hours": 8  # Number of hours to extend (1-24)
        }
    
    Returns:
        {"success": true, "expires_at": "2024-01-01T12:00:00", "message": "..."}
    """
    try:
        if not authorization:
            raise HTTPException(status_code=401, detail="Authorization required")
        
        # Extract session_id from JWT
        token = authorization.replace("Bearer ", "")
        payload = auth_service.verify_jwt_token(token)
        
        if not payload:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        
        session_id = payload.get("session_id")
        
        new_expires_at = await auth_service.extend_session(
            session_id=session_id,
            hours=extend_req.hours
        )
        
        return {
            "success": True,
            "expires_at": new_expires_at.isoformat(),
            "message": f"Session extended by {extend_req.hours} hours"
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Session extension error: {e}")
        raise HTTPException(status_code=500, detail="Failed to extend session")


@router.get("/validate")
async def validate_token(authorization: Optional[str] = Header(None)):
    """
    Validate JWT token and return user info
    
    Headers:
        Authorization: Bearer <token>
    
    Returns:
        User information if token is valid
    """
    try:
        if not authorization:
            raise HTTPException(status_code=401, detail="Authorization header required")
        
        token = authorization.replace("Bearer ", "")
        payload = auth_service.verify_jwt_token(token)
        
        if not payload:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        
        session_id = payload.get("session_id")
        user = auth_service.validate_session(session_id)
        
        if not user:
            raise HTTPException(status_code=401, detail="Session expired or invalid")
        
        # Get sandbox info if applicable
        database_name = None
        sql_login = None
        if user['role'] == 'sandbox':
            sandbox = auth_db.get_sandbox_by_user_id(user['user_id'])
            if sandbox:
                database_name = sandbox['database_name']
                sql_login = sandbox['sql_login']
        
        return {
            "valid": True,
            "user": {
                "user_id": user['user_id'],
                "username": user['username'],
                "email": user['email'],
                "role": user['role'],
                "database_name": database_name,
                "sql_login": sql_login
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token validation error: {e}")
        raise HTTPException(status_code=500, detail="Validation failed")


@router.get("/session-info")
async def get_session_info(authorization: Optional[str] = Header(None)):
    """
    Get detailed session information including expiration time
    
    Returns:
        Session details and user info
    """
    try:
        if not authorization:
            raise HTTPException(status_code=401, detail="Authorization required")
        
        token = authorization.replace("Bearer ", "")
        payload = auth_service.verify_jwt_token(token)
        
        if not payload:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        session_id = payload.get("session_id")
        session = auth_db.get_session(session_id)
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        user = auth_db.get_user_by_id(session['user_id'])
        
        # Get sandbox info
        sandbox_info = None
        if user['role'] == 'sandbox':
            sandbox = auth_db.get_sandbox_by_user_id(user['user_id'])
            if sandbox:
                sandbox_info = {
                    "database_name": sandbox['database_name'],
                    "created_at": sandbox['created_at'],
                    "expires_at": sandbox['expires_at']
                }
        
        return {
            "session_id": session['session_id'],
            "created_at": session['created_at'],
            "expires_at": session['expires_at'],
            "last_activity": session['last_activity'],
            "user": {
                "username": user['username'],
                "role": user['role'],
                "email": user['email']
            },
            "sandbox": sandbox_info
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Session info error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get session info")