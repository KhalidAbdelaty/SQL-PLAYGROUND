import uuid
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict
import config


class SessionManager:
    """Manages user sessions and tracking"""
    
    def __init__(self):
        self.sessions: Dict[str, dict] = {}
        self.query_history: Dict[str, list] = {}
    
    def create_session(self) -> str:
        """Create a new session and return session ID"""
        session_id = str(uuid.uuid4())
        self.sessions[session_id] = {
            "created_at": datetime.now(),
            "last_activity": datetime.now(),
            "query_count": 0
        }
        self.query_history[session_id] = []
        return session_id
    
    def validate_session(self, session_id: str) -> bool:
        """Check if session is valid and not expired"""
        if session_id not in self.sessions:
            return False
        
        session = self.sessions[session_id]
        last_activity = session.get("last_activity")
        
        if not last_activity:
            return False
        
        # Check if session expired
        if datetime.now() - last_activity > timedelta(seconds=config.SESSION_TIMEOUT):
            self.cleanup_session(session_id)
            return False
        
        return True
    
    def update_activity(self, session_id: str):
        """Update last activity timestamp for session"""
        if session_id in self.sessions:
            self.sessions[session_id]["last_activity"] = datetime.now()
            self.sessions[session_id]["query_count"] += 1
    
    def add_to_history(self, session_id: str, query: str, result: dict):
        """Add query to session history"""
        if session_id not in self.query_history:
            self.query_history[session_id] = []
        
        history_entry = {
            "id": str(uuid.uuid4()),
            "query": query,
            "timestamp": datetime.now().isoformat(),
            "execution_time": result.get("execution_time", 0),
            "row_count": result.get("row_count", 0),
            "success": result.get("success", False),
            "error": result.get("error")
        }
        
        self.query_history[session_id].append(history_entry)
        
        # Keep only recent history
        if len(self.query_history[session_id]) > config.MAX_HISTORY_ITEMS:
            self.query_history[session_id] = self.query_history[session_id][-config.MAX_HISTORY_ITEMS:]
    
    def get_history(self, session_id: str, limit: Optional[int] = None) -> list:
        """Get query history for session"""
        if session_id not in self.query_history:
            return []
        
        history = self.query_history[session_id]
        
        if limit:
            return history[-limit:]
        
        return history
    
    def cleanup_session(self, session_id: str):
        """Remove expired session data"""
        if session_id in self.sessions:
            del self.sessions[session_id]
        if session_id in self.query_history:
            del self.query_history[session_id]
    
    def cleanup_expired_sessions(self):
        """Clean up all expired sessions"""
        expired = []
        for session_id, session in self.sessions.items():
            last_activity = session.get("last_activity")
            if last_activity and datetime.now() - last_activity > timedelta(seconds=config.SESSION_TIMEOUT):
                expired.append(session_id)
        
        for session_id in expired:
            self.cleanup_session(session_id)
    
    def get_session_info(self, session_id: str) -> Optional[dict]:
        """Get session information"""
        return self.sessions.get(session_id)


# Global session manager
session_manager = SessionManager()


def generate_request_id() -> str:
    """Generate unique request ID for tracking"""
    return str(uuid.uuid4())


def hash_query(query: str) -> str:
    """Generate hash of query for caching/comparison"""
    return hashlib.sha256(query.encode()).hexdigest()