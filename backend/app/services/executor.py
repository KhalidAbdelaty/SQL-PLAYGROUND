import time
import logging
from typing import Optional, Dict, Any
from datetime import datetime
import asyncio
from concurrent.futures import ThreadPoolExecutor
from app.database import db_manager
from app.services.validator import query_validator
from app.services.audit import audit_logger
from app.services.analytics import analytics_service
import config

logger = logging.getLogger(__name__)


class QueryExecutor:
    """Handles query execution with timeouts and resource management"""
    
    def __init__(self):
        self.executor = ThreadPoolExecutor(max_workers=10)
        self.active_queries = {}  # session_id -> query info
    
    async def execute(
        self,
        query: str,
        database: Optional[str] = None,
        session_id: Optional[str] = None,
        confirm_destructive: bool = False
    ) -> Dict[str, Any]:
        """
        Execute SQL query asynchronously
        
        Args:
            query: SQL query to execute
            database: Target database
            session_id: User session identifier
            confirm_destructive: Whether user confirmed destructive operation
            
        Returns:
            Dictionary with execution results
        """
        start_time = time.time()
        
        # Validate query
        is_valid, error_msg, requires_confirmation = query_validator.validate(query)
        
        if not is_valid:
            return {
                "success": False,
                "error": error_msg,
                "execution_time": 0
            }
        
        # Check if confirmation needed but not provided
        if requires_confirmation and not confirm_destructive:
            return {
                "success": False,
                "requires_confirmation": True,
                "warning": "This is a destructive operation. Please confirm to proceed.",
                "execution_time": 0
            }
        
        # Check concurrent query limit
        if session_id:
            active_count = sum(
                1 for sid, info in self.active_queries.items() 
                if sid == session_id and info.get("active", False)
            )
            if active_count >= config.MAX_CONCURRENT_QUERIES:
                return {
                    "success": False,
                    "error": f"Maximum concurrent queries ({config.MAX_CONCURRENT_QUERIES}) reached",
                    "execution_time": 0
                }
        
        # Track active query
        if session_id:
            self.active_queries[session_id] = {
                "query": query,
                "start_time": start_time,
                "active": True
            }
        
        try:
            # Execute query in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            rows, columns, row_count = await loop.run_in_executor(
                self.executor,
                self._execute_sync,
                query,
                database
            )
            
            execution_time = time.time() - start_time
            
            # Format results
            if rows is not None:
                # Convert rows to list of dicts
                data = []
                for row in rows:
                    row_dict = {}
                    for i, col in enumerate(columns):
                        value = row[i]
                        # Handle datetime objects
                        if isinstance(value, datetime):
                            value = value.isoformat()
                        # Handle bytes
                        elif isinstance(value, bytes):
                            value = value.decode('utf-8', errors='ignore')
                        row_dict[col] = value
                    data.append(row_dict)
                
                result = {
                    "success": True,
                    "data": data,
                    "columns": columns,
                    "row_count": row_count,
                    "execution_time": round(execution_time, 3),
                    "message": f"Query returned {row_count} row(s)"
                }
            else:
                result = {
                    "success": True,
                    "data": None,
                    "columns": None,
                    "row_count": row_count,
                    "execution_time": round(execution_time, 3),
                    "message": f"Query executed successfully. {row_count} row(s) affected"
                }
            
            # Log to audit
            if config.ENABLE_AUDIT_LOG:
                audit_logger.log_query(
                    session_id=session_id or "unknown",
                    query=query,
                    database=database or config.DB_DATABASE,
                    success=True,
                    execution_time=execution_time,
                    row_count=row_count
                )
            
            # Track analytics
            try:
                analytics_service.track_query_execution(
                    user_id=None,  # Will be set by route handler if available
                    username=session_id or "anonymous",
                    query_text=query,
                    database_name=database or config.DB_DATABASE,
                    execution_time_ms=int(execution_time * 1000),
                    rows_returned=row_count,
                    success=True
                )
            except Exception as e:
                logger.error(f"Failed to track analytics: {e}")
            
            return result
            
        except Exception as e:
            execution_time = time.time() - start_time
            error_msg = str(e)
            
            logger.error(f"Query execution error: {error_msg}")
            
            # Log failed query
            if config.ENABLE_AUDIT_LOG:
                audit_logger.log_query(
                    session_id=session_id or "unknown",
                    query=query,
                    database=database or config.DB_DATABASE,
                    success=False,
                    execution_time=execution_time,
                    error=error_msg
                )
            
            # Track failed query analytics
            try:
                analytics_service.track_query_execution(
                    user_id=None,
                    username=session_id or "anonymous",
                    query_text=query,
                    database_name=database or config.DB_DATABASE,
                    execution_time_ms=int(execution_time * 1000),
                    rows_returned=0,
                    success=False,
                    error_message=error_msg
                )
            except Exception as e:
                logger.error(f"Failed to track analytics: {e}")
            
            return {
                "success": False,
                "error": error_msg,
                "execution_time": round(execution_time, 3)
            }
        
        finally:
            # Remove from active queries
            if session_id and session_id in self.active_queries:
                self.active_queries[session_id]["active"] = False
    
    def _execute_sync(self, query: str, database: Optional[str] = None):
        """Synchronous query execution (runs in thread pool)"""
        return db_manager.execute_query(query, database)
    
    async def execute_multiple(
        self,
        queries: list,
        database: Optional[str] = None,
        session_id: Optional[str] = None,
        confirm_destructive: bool = False
    ) -> list:
        """
        Execute multiple queries sequentially
        
        Args:
            queries: List of SQL queries
            database: Target database
            session_id: User session identifier
            confirm_destructive: Whether user confirmed destructive operations
            
        Returns:
            List of execution results
        """
        results = []
        
        for query in queries:
            result = await self.execute(
                query=query,
                database=database,
                session_id=session_id,
                confirm_destructive=confirm_destructive
            )
            results.append(result)
            
            # Stop on first error
            if not result.get("success"):
                break
        
        return results
    
    def get_active_queries(self, session_id: Optional[str] = None) -> list:
        """Get list of active queries, optionally filtered by session"""
        if session_id:
            return [
                info for sid, info in self.active_queries.items()
                if sid == session_id and info.get("active", False)
            ]
        return [
            info for info in self.active_queries.values()
            if info.get("active", False)
        ]


# Global executor instance
query_executor = QueryExecutor()