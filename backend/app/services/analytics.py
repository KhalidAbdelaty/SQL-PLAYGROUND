"""
Usage analytics service for tracking user activity
"""
import sqlite3
from pathlib import Path
from contextlib import contextmanager
from datetime import datetime
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

# Analytics database path
ANALYTICS_DB_PATH = Path(__file__).resolve().parent.parent.parent / "analytics.db"


class AnalyticsService:
    """Tracks user activity and query statistics"""
    
    def __init__(self):
        self.db_path = ANALYTICS_DB_PATH
        self._initialize_database()
    
    def _initialize_database(self):
        """Create analytics tables if they don't exist"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Query execution tracking
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS query_executions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    username TEXT,
                    query_text TEXT,
                    database_name TEXT,
                    execution_time_ms INTEGER,
                    rows_returned INTEGER,
                    success BOOLEAN,
                    error_message TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # User activity tracking
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_activity (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    username TEXT,
                    activity_type TEXT,
                    details TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Feature usage tracking
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS feature_usage (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    feature_name TEXT,
                    user_id INTEGER,
                    username TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            conn.commit()
            logger.info(f"Analytics database initialized at {self.db_path}")
    
    @contextmanager
    def get_connection(self):
        """Context manager for database connections"""
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        except Exception as e:
            conn.rollback()
            logger.error(f"Analytics database error: {e}")
            raise
        finally:
            conn.close()
    
    def track_query_execution(
        self,
        user_id: Optional[int],
        username: str,
        query_text: str,
        database_name: str,
        execution_time_ms: int,
        rows_returned: int,
        success: bool,
        error_message: Optional[str] = None
    ):
        """Track a query execution"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO query_executions 
                    (user_id, username, query_text, database_name, execution_time_ms, 
                     rows_returned, success, error_message)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (user_id, username, query_text[:1000], database_name, 
                      execution_time_ms, rows_returned, success, error_message))
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to track query execution: {e}")
    
    def track_user_activity(
        self,
        user_id: Optional[int],
        username: str,
        activity_type: str,
        details: Optional[str] = None
    ):
        """Track user activity"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO user_activity (user_id, username, activity_type, details)
                    VALUES (?, ?, ?, ?)
                """, (user_id, username, activity_type, details))
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to track user activity: {e}")
    
    def track_feature_usage(
        self,
        feature_name: str,
        user_id: Optional[int],
        username: str
    ):
        """Track feature usage"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO feature_usage (feature_name, user_id, username)
                    VALUES (?, ?, ?)
                """, (feature_name, user_id, username))
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to track feature usage: {e}")
    
    def get_query_statistics(self, days: int = 7) -> Dict:
        """Get query execution statistics for the last N days"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                # Total queries
                cursor.execute("""
                    SELECT COUNT(*) as total
                    FROM query_executions
                    WHERE timestamp > datetime('now', '-' || ? || ' days')
                """, (days,))
                total_queries = cursor.fetchone()['total']
                
                # Success rate
                cursor.execute("""
                    SELECT 
                        SUM(CASE WHEN success THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as success_rate
                    FROM query_executions
                    WHERE timestamp > datetime('now', '-' || ? || ' days')
                """, (days,))
                success_rate = cursor.fetchone()['success_rate'] or 0
                
                # Average execution time
                cursor.execute("""
                    SELECT AVG(execution_time_ms) as avg_time
                    FROM query_executions
                    WHERE timestamp > datetime('now', '-' || ? || ' days')
                    AND success = 1
                """, (days,))
                avg_time = cursor.fetchone()['avg_time'] or 0
                
                # Most active users
                cursor.execute("""
                    SELECT username, COUNT(*) as query_count
                    FROM query_executions
                    WHERE timestamp > datetime('now', '-' || ? || ' days')
                    GROUP BY username
                    ORDER BY query_count DESC
                    LIMIT 10
                """, (days,))
                top_users = [dict(row) for row in cursor.fetchall()]
                
                return {
                    "total_queries": total_queries,
                    "success_rate": round(success_rate, 2),
                    "avg_execution_time_ms": round(avg_time, 2),
                    "top_users": top_users
                }
        except Exception as e:
            logger.error(f"Failed to get query statistics: {e}")
            return {}
    
    def get_popular_features(self, days: int = 7) -> List[Dict]:
        """Get most used features"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT feature_name, COUNT(*) as usage_count
                    FROM feature_usage
                    WHERE timestamp > datetime('now', '-' || ? || ' days')
                    GROUP BY feature_name
                    ORDER BY usage_count DESC
                    LIMIT 10
                """, (days,))
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"Failed to get popular features: {e}")
            return []


# Global instance
analytics_service = AnalyticsService()

