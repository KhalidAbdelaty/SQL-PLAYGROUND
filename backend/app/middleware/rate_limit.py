"""
Rate limiting middleware to prevent abuse
"""
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from collections import defaultdict
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Simple rate limiting middleware
    Limits requests per IP address
    """
    
    def __init__(self, app, requests_per_minute: int = 60):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.request_counts = defaultdict(list)
        self.cleanup_interval = timedelta(minutes=5)
        self.last_cleanup = datetime.now()
    
    async def dispatch(self, request: Request, call_next):
        """Process request with rate limiting"""
        
        # Get client IP
        client_ip = self._get_client_ip(request)
        
        # Cleanup old entries periodically
        if datetime.now() - self.last_cleanup > self.cleanup_interval:
            self._cleanup_old_entries()
        
        # Check rate limit
        current_time = datetime.now()
        one_minute_ago = current_time - timedelta(minutes=1)
        
        # Get recent requests from this IP
        recent_requests = [
            req_time for req_time in self.request_counts[client_ip]
            if req_time > one_minute_ago
        ]
        
        # Check if limit exceeded
        if len(recent_requests) >= self.requests_per_minute:
            logger.warning(f"Rate limit exceeded for IP: {client_ip}")
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please try again later."
            )
        
        # Add current request
        recent_requests.append(current_time)
        self.request_counts[client_ip] = recent_requests
        
        # Process request
        response = await call_next(request)
        return response
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request"""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"
    
    def _cleanup_old_entries(self):
        """Remove old request records to prevent memory bloat"""
        current_time = datetime.now()
        one_hour_ago = current_time - timedelta(hours=1)
        
        # Remove IPs with no recent requests
        ips_to_remove = []
        for ip, requests in self.request_counts.items():
            recent = [req for req in requests if req > one_hour_ago]
            if recent:
                self.request_counts[ip] = recent
            else:
                ips_to_remove.append(ip)
        
        for ip in ips_to_remove:
            del self.request_counts[ip]
        
        self.last_cleanup = current_time
        logger.debug(f"Rate limit cleanup: {len(ips_to_remove)} IPs removed")

