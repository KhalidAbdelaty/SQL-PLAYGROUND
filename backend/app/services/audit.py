import json
import logging
from datetime import datetime
from typing import Optional
import config

logger = logging.getLogger(__name__)


class AuditLogger:
    """Logs all query executions for audit trail"""
    
    def __init__(self):
        self.log_file = config.AUDIT_LOG_FILE
        self._setup_logger()
    
    def _setup_logger(self):
        """Setup file logger for audit trail"""
        self.audit_logger = logging.getLogger("audit")
        self.audit_logger.setLevel(logging.INFO)
        
        # Remove existing handlers
        self.audit_logger.handlers = []
        
        # Create file handler
        handler = logging.FileHandler(self.log_file, encoding='utf-8')
        handler.setLevel(logging.INFO)
        
        # Create formatter
        formatter = logging.Formatter('%(message)s')
        handler.setFormatter(formatter)
        
        self.audit_logger.addHandler(handler)
    
    def log_query(
        self,
        session_id: str,
        query: str,
        database: str,
        success: bool,
        execution_time: float,
        row_count: int = 0,
        error: Optional[str] = None
    ):
        """
        Log query execution
        
        Args:
            session_id: User session identifier
            query: SQL query executed
            database: Target database
            success: Whether execution succeeded
            execution_time: Execution time in seconds
            row_count: Number of rows affected/returned
            error: Error message if failed
        """
        if not config.ENABLE_AUDIT_LOG:
            return
        
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "session_id": session_id,
            "database": database,
            "query": query[:500],  # Truncate long queries
            "success": success,
            "execution_time": round(execution_time, 3),
            "row_count": row_count,
            "error": error
        }
        
        try:
            self.audit_logger.info(json.dumps(log_entry))
        except Exception as e:
            logger.error(f"Failed to write audit log: {e}")
    
    def get_recent_logs(self, limit: int = 100) -> list:
        """
        Get recent audit log entries
        
        Args:
            limit: Maximum number of entries to return
            
        Returns:
            List of log entries
        """
        try:
            with open(self.log_file, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            # Get last N lines
            recent_lines = lines[-limit:]
            
            # Parse JSON entries
            entries = []
            for line in recent_lines:
                try:
                    entry = json.loads(line.strip())
                    entries.append(entry)
                except json.JSONDecodeError:
                    continue
            
            return entries
        except FileNotFoundError:
            return []
        except Exception as e:
            logger.error(f"Failed to read audit log: {e}")
            return []


# Global audit logger instance
audit_logger = AuditLogger()