from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Optional
import logging
from app.auth.service import auth_service

logger = logging.getLogger(__name__)


class AuthMiddleware(BaseHTTPMiddleware):
    """
    Middleware to validate JWT tokens on protected routes
    """
    
    # Routes that don't require authentication
    PUBLIC_ROUTES = [
        "/",
        "/health",
        "/docs",
        "/redoc",
        "/openapi.json",
        "/api/auth/check-setup",
        "/api/auth/setup-admin",
        "/api/auth/login",
        "/api/auth/register-sandbox",
    ]
    
    async def dispatch(self, request: Request, call_next):
        """
        Process request and validate authentication
        """
        # Allow CORS preflight requests (OPTIONS) to pass through
        if request.method == "OPTIONS":
            return await call_next(request)
        
        # Check if route is public
        if self._is_public_route(request.url.path):
            return await call_next(request)
        
        # Extract token from Authorization header
        authorization = request.headers.get("Authorization")
        
        if not authorization:
            return JSONResponse(
                status_code=401,
                content={"detail": "Authorization header required"}
            )
        
        try:
            # Verify token
            token = authorization.replace("Bearer ", "")
            payload = auth_service.verify_jwt_token(token)
            
            if not payload:
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Invalid or expired token"}
                )
            
            # Validate session
            session_id = payload.get("session_id")
            user = auth_service.validate_session(session_id)
            
            if not user:
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Session expired or invalid"}
                )
            
            # Add user info to request state
            request.state.user_id = user['user_id']
            request.state.username = user['username']
            request.state.role = user['role']
            request.state.session_id = session_id
            
            # Continue processing request
            response = await call_next(request)
            return response
            
        except Exception as e:
            logger.error(f"Auth middleware error: {e}")
            return JSONResponse(
                status_code=500,
                content={"detail": "Authentication error"}
            )
    
    def _is_public_route(self, path: str) -> bool:
        """Check if route is public"""
        # Exact match
        if path in self.PUBLIC_ROUTES:
            return True
        
        # Prefix match for docs and static files
        public_prefixes = ["/docs", "/redoc", "/openapi.json", "/api/auth/"]
        for prefix in public_prefixes:
            if path.startswith(prefix):
                return True
        
        return False


def get_current_user(request: Request) -> dict:
    """
    Dependency to get current authenticated user from request state
    
    Usage:
        @router.get("/protected")
        async def protected_route(user: dict = Depends(get_current_user)):
            return {"user": user}
    """
    if not hasattr(request.state, "user_id"):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    return {
        "user_id": request.state.user_id,
        "username": request.state.username,
        "role": request.state.role,
        "session_id": request.state.session_id
    }