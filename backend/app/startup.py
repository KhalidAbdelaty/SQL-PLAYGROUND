"""
Startup validation to ensure SQL Server is properly configured
"""
import logging
from app.services.provisioner import provisioner
import config

logger = logging.getLogger(__name__)


def validate_sql_server_connection():
    """
    Validate SQL Server is accessible and has required permissions
    
    Returns:
        bool: True if validation successful, False otherwise
    """
    try:
        logger.info("Validating SQL Server connection...")
        conn = provisioner._get_admin_connection()
        cursor = conn.cursor()
        
        # Get server info
        cursor.execute("SELECT @@VERSION, DB_NAME(), SUSER_NAME()")
        row = cursor.fetchone()
        version = row[0][:80]
        database = row[1]
        login = row[2]
        
        logger.info(f"  Connected as: {login}")
        logger.info(f"  Database: {database}")
        logger.info(f"  Version: {version}")
        
        cursor.execute("""
            SELECT 
                CASE 
                    WHEN IS_SRVROLEMEMBER('sysadmin') = 1 THEN 1 
                    ELSE HAS_PERMS_BY_NAME(NULL, 'DATABASE', 'CREATE DATABASE') 
                END AS can_create_db,
                CASE 
                    WHEN IS_SRVROLEMEMBER('sysadmin') = 1 THEN 1 
                    ELSE HAS_PERMS_BY_NAME(NULL, 'SERVER', 'ALTER ANY LOGIN') 
                END AS can_create_login
        """)
        perms = cursor.fetchone()
        can_create_db = perms[0]
        can_create_login = perms[1]
        
        conn.close()
        
        # Validate permissions
        if not can_create_db:
            logger.error("  ✗ Missing CREATE DATABASE permission")
            logger.error("  Grant with: ALTER SERVER ROLE sysadmin ADD MEMBER [your_login]")
            return False
            
        if not can_create_login:
            logger.error("  ✗ Missing ALTER ANY LOGIN permission")
            logger.error("  Grant with: ALTER SERVER ROLE sysadmin ADD MEMBER [your_login]")
            return False
        
        logger.info("  ✓ Has CREATE DATABASE permission")
        logger.info("  ✓ Has ALTER ANY LOGIN permission")
        logger.info("✓ SQL Server connection validated successfully")
        return True
        
    except Exception as e:
        logger.error(f"✗ SQL Server validation failed: {e}")
        logger.error("  Application will start but sandbox creation will fail!")
        logger.error("  Please check:")
        logger.error(f"    - Server name: {config.DB_SERVER}")
        logger.error(f"    - Database: {config.DB_DATABASE}")
        logger.error(f"    - Authentication method: {'Windows' if config.DB_TRUSTED_CONNECTION else 'SQL Server'}")
        if not config.DB_TRUSTED_CONNECTION:
            logger.error(f"    - Username: {config.DB_USERNAME}")
        logger.error("    - SQL Server service is running")
        logger.error("    - TCP/IP is enabled in SQL Server Configuration")
        logger.error("    - Windows Firewall allows port 1433")
        return False
