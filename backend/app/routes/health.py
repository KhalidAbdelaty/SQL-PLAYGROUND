from fastapi import APIRouter, HTTPException
from app.services.provisioner import provisioner
import config
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/health", tags=["health"])


@router.get("/sqlserver")
async def check_sql_server():
    """
    Test SQL Server connectivity and permissions
    
    Returns detailed information about SQL Server connection status
    """
    try:
        conn = provisioner._get_admin_connection()
        cursor = conn.cursor()
        
        # Get version info
        cursor.execute("SELECT @@VERSION, DB_NAME(), SUSER_NAME()")
        row = cursor.fetchone()
        version = row[0]
        database = row[1]
        login_name = row[2]
        
        # Check permissions
        cursor.execute("""
            SELECT 
                HAS_PERMS_BY_NAME(NULL, 'DATABASE', 'CREATE DATABASE') AS can_create_db,
                HAS_PERMS_BY_NAME(NULL, 'SERVER', 'ALTER ANY LOGIN') AS can_create_login
        """)
        perms = cursor.fetchone()
        can_create_db = perms[0]
        can_create_login = perms[1]
        
        conn.close()
        
        # Check if we have required permissions
        if not can_create_db or not can_create_login:
            return {
                "connected": True,
                "version": version[:100] + "...",
                "database": database,
                "login": login_name,
                "permissions": {
                    "create_database": bool(can_create_db),
                    "create_login": bool(can_create_login)
                },
                "warning": "Missing required permissions for sandbox creation"
            }
        
        return {
            "connected": True,
            "version": version[:100] + "...",
            "database": database,
            "login": login_name,
            "permissions": {
                "create_database": bool(can_create_db),
                "create_login": bool(can_create_login)
            },
            "status": "Ready for sandbox creation"
        }
        
    except Exception as e:
        logger.error(f"SQL Server health check failed: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"SQL Server unavailable: {str(e)}"
        )


@router.get("/backend")
async def check_backend():
    """Check backend service health"""
    from app.auth.database import auth_db
    
    try:
        # Check auth database
        admin_exists = auth_db.check_admin_exists()
        
        return {
            "status": "healthy",
            "authentication": {
                "database": "connected",
                "admin_exists": admin_exists
            },
            "config": {
                "server": config.DB_SERVER,
                "database": config.DB_DATABASE,
                "session_duration_hours": config.SESSION_DURATION_HOURS
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Backend health check failed: {str(e)}"
        )
