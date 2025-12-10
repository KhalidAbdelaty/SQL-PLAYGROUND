import logging
from datetime import datetime
from typing import List
from app.auth.database import auth_db
from app.services.provisioner import provisioner

logger = logging.getLogger(__name__)


async def cleanup_expired_sandboxes() -> int:
    """
    Cleanup all expired sandbox databases
    
    Returns:
        Number of sandboxes cleaned up
    """
    try:
        # Get all expired sandboxes marked for auto cleanup
        expired = auth_db.get_expired_sandboxes()
        
        if not expired:
            logger.info("No expired sandboxes to cleanup")
            return 0
        
        logger.info(f"Found {len(expired)} expired sandbox(es) to cleanup")
        
        cleaned_count = 0
        for sandbox in expired:
            try:
                logger.info(f"Cleaning up sandbox: {sandbox['database_name']}")
                
                # Drop SQL Server database and login
                provisioner.cleanup_sandbox_environment(
                    database_name=sandbox['database_name'],
                    sql_login=sandbox['sql_login']
                )
                
                # Remove from auth database
                auth_db.delete_sandbox(sandbox['db_id'])
                
                # Delete user
                auth_db.delete_user(sandbox['user_id'])
                
                auth_db.log_auth_event(
                    sandbox['user_id'],
                    "sandbox_auto_cleaned",
                    f"Expired at {sandbox['expires_at']}"
                )
                
                cleaned_count += 1
                logger.info(f"Successfully cleaned up sandbox: {sandbox['database_name']}")
                
            except Exception as e:
                logger.error(f"Failed to cleanup sandbox {sandbox['database_name']}: {e}")
                # Continue with next sandbox even if one fails
                continue
        
        logger.info(f"Cleanup complete: {cleaned_count}/{len(expired)} sandboxes cleaned")
        return cleaned_count
        
    except Exception as e:
        logger.error(f"Error during sandbox cleanup: {e}")
        return 0


async def cleanup_sandbox_by_user_id(user_id: int) -> bool:
    """
    Cleanup a specific user's sandbox
    
    Args:
        user_id: User ID to cleanup
        
    Returns:
        True if successful, False otherwise
    """
    try:
        sandbox = auth_db.get_sandbox_by_user_id(user_id)
        if not sandbox:
            logger.warning(f"No sandbox found for user_id: {user_id}")
            return False
        
        # Drop SQL Server database and login
        provisioner.cleanup_sandbox_environment(
            database_name=sandbox['database_name'],
            sql_login=sandbox['sql_login']
        )
        
        # Remove from auth database
        auth_db.delete_sandbox(sandbox['db_id'])
        auth_db.delete_user(user_id)
        
        auth_db.log_auth_event(user_id, "sandbox_manual_cleaned", f"User ID: {user_id}")
        
        logger.info(f"Successfully cleaned up sandbox for user_id: {user_id}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to cleanup sandbox for user_id {user_id}: {e}")
        return False


def get_sandbox_statistics() -> dict:
    """
    Get statistics about sandbox databases
    
    Returns:
        Dictionary with sandbox statistics
    """
    try:
        with auth_db.get_connection() as conn:
            cursor = conn.cursor()
            
            # Total sandboxes
            cursor.execute("SELECT COUNT(*) as count FROM sandbox_databases")
            total = cursor.fetchone()['count']
            
            # Active sandboxes (not expired)
            cursor.execute("""
                SELECT COUNT(*) as count FROM sandbox_databases
                WHERE expires_at > datetime('now')
            """)
            active = cursor.fetchone()['count']
            
            # Expired sandboxes
            cursor.execute("""
                SELECT COUNT(*) as count FROM sandbox_databases
                WHERE expires_at <= datetime('now')
            """)
            expired = cursor.fetchone()['count']
            
            # Average lifetime
            cursor.execute("""
                SELECT 
                    AVG((julianday(expires_at) - julianday(created_at)) * 24) as avg_hours
                FROM sandbox_databases
            """)
            avg_lifetime = cursor.fetchone()['avg_hours']
            
            return {
                "total_sandboxes": total,
                "active_sandboxes": active,
                "expired_sandboxes": expired,
                "average_lifetime_hours": round(avg_lifetime, 2) if avg_lifetime else 0
            }
            
    except Exception as e:
        logger.error(f"Error getting sandbox statistics: {e}")
        return {
            "total_sandboxes": 0,
            "active_sandboxes": 0,
            "expired_sandboxes": 0,
            "average_lifetime_hours": 0,
            "error": str(e)
        }