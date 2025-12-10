import pyodbc
import secrets
import string
from datetime import datetime
from typing import Tuple, Optional
import logging
import config

logger = logging.getLogger(__name__)


class SQLServerProvisioner:
    """Provisions SQL Server databases and logins for sandbox users"""
    
    def __init__(self):
        self.admin_connection_string = config.CONNECTION_STRING
    
    def generate_secure_password(self, length: int = 16) -> str:
        """Generate a secure random password"""
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        # Ensure at least one of each type
        password = [
            secrets.choice(string.ascii_uppercase),
            secrets.choice(string.ascii_lowercase),
            secrets.choice(string.digits),
            secrets.choice("!@#$%^&*")
        ]
        # Fill the rest
        password += [secrets.choice(alphabet) for _ in range(length - 4)]
        # Shuffle
        secrets.SystemRandom().shuffle(password)
        return ''.join(password)
    
    def create_sandbox_environment(self, username: str) -> Tuple[str, str, str]:
        """
        Create a complete sandbox environment for a user
        
        Returns:
            Tuple of (database_name, sql_login, sql_password)
        """
        # Generate unique names
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        database_name = f"SandboxDB_{username}_{timestamp}"
        sql_login = f"sandbox_{username}_{timestamp}"
        sql_password = self.generate_secure_password()
        
        try:
            with self._get_admin_connection() as conn:
                conn.autocommit = True
                cursor = conn.cursor()
                
                # 1. Create SQL Server Login
                logger.info(f"Creating SQL login: {sql_login}")
                # Escape SQL identifiers to prevent injection
                safe_login = sql_login.replace(']', ']]')
                # Escape password for SQL string (double single quotes)
                safe_password = sql_password.replace("'", "''")
                cursor.execute(f"""
                    CREATE LOGIN [{safe_login}] WITH PASSWORD = N'{safe_password}',
                    CHECK_POLICY = OFF,
                    CHECK_EXPIRATION = OFF
                """)
                
                # 2. Create Database
                logger.info(f"Creating database: {database_name}")
                safe_db_name = database_name.replace(']', ']]')
                cursor.execute(f"CREATE DATABASE [{safe_db_name}]")
                
                # Wait for database creation to complete
                cursor.execute("WAITFOR DELAY '00:00:03'")
                conn.commit()

                # Set database size limit (100MB max for data, 50MB for log) - best-effort using a fresh connection
                try:
                    # Open a fresh connection so metadata for the new DB is visible
                    with self._get_admin_connection() as conn2:
                        conn2.autocommit = True
                        cursor2 = conn2.cursor()

                        # Get logical file names and types for the new database
                        cursor2.execute(f"""
                            SELECT name, type_desc FROM sys.master_files 
                            WHERE database_id = DB_ID('{safe_db_name}');
                        """)
                        files = cursor2.fetchall()

                        if files:
                            for file in files:
                                file_name = file[0]
                                file_type = file[1]  # 'ROWS' for data, 'LOG' for log
                                # Choose sensible limits per file type
                                if file_type == "ROWS":
                                    size_limit = "100MB"
                                    growth = "10MB"  # Grow by 10MB at a time
                                else:  # LOG file
                                    size_limit = "50MB"
                                    growth = "5MB"   # Grow by 5MB at a time
                                
                                logger.info(f"Setting size limit for file {file_name} ({file_type})")
                                cursor2.execute(f"""
                                    ALTER DATABASE [{safe_db_name}]
                                    MODIFY FILE (NAME = N'{file_name}', MAXSIZE = {size_limit}, FILEGROWTH = {growth});
                                """)
                            logger.info(f"Set size limits for {database_name} (data=100MB, log=50MB)")
                        else:
                            logger.warning(f"No files found for {safe_db_name}, skipping size limit")
                except Exception as e:
                    logger.warning(f"Could not set size limit for {database_name}: {e}")
                
                # 3. Switch to the new database context
                cursor.execute(f"USE [{safe_db_name}]")
                
                # 4. Create user in the new database
                cursor.execute(f"CREATE USER [{safe_login}] FOR LOGIN [{safe_login}]")
                
                # 5. Grant permissions (limited but functional)
                # Allow creating/modifying tables, views, procedures
                cursor.execute(f"ALTER ROLE db_datareader ADD MEMBER [{safe_login}]")
                cursor.execute(f"ALTER ROLE db_datawriter ADD MEMBER [{safe_login}]")
                cursor.execute(f"ALTER ROLE db_ddladmin ADD MEMBER [{safe_login}]")
                
                # 6. Grant additional specific permissions
                cursor.execute(f"GRANT CREATE TABLE TO [{safe_login}]")
                cursor.execute(f"GRANT CREATE VIEW TO [{safe_login}]")
                cursor.execute(f"GRANT CREATE PROCEDURE TO [{safe_login}]")
                cursor.execute(f"GRANT CREATE FUNCTION TO [{safe_login}]")
                
                # 7. Note: User is already restricted to their sandbox database
                # Additional restrictions are enforced at the SQL Server level
                # The db_ddladmin role allows DDL operations within this database only
                
                # 8. Create a welcome table
                cursor.execute(f"""
                    CREATE TABLE Welcome (
                        id INT PRIMARY KEY IDENTITY(1,1),
                        message NVARCHAR(200),
                        created_at DATETIME DEFAULT GETDATE()
                    )
                """)
                cursor.execute(f"""
                    INSERT INTO Welcome (message) 
                    VALUES ('Welcome to your SQL Playground sandbox! Feel free to experiment.')
                """)
                
                logger.info(f"Successfully created sandbox environment for {username}")
                return database_name, sql_login, sql_password
                
        except pyodbc.Error as e:
            logger.error(f"Failed to create sandbox environment: {e}")
            # Attempt cleanup on failure
            self._cleanup_failed_provisioning(database_name, sql_login)
            raise Exception(f"Failed to provision sandbox: {str(e)}")
    
    def cleanup_sandbox_environment(self, database_name: str, sql_login: str) -> None:
        """
        Completely remove a sandbox environment
        
        Args:
            database_name: Name of the database to drop
            sql_login: SQL Server login to drop
        """
        try:
            with self._get_admin_connection() as conn:
                conn.autocommit = True
                cursor = conn.cursor()
                
                # 1. Kill all connections to the database
                logger.info(f"Killing connections to {database_name}")
                safe_db_name = database_name.replace(']', ']]')
                cursor.execute(f"""
                    DECLARE @kill varchar(max) = '';
                    SELECT @kill = @kill + 'KILL ' + CONVERT(varchar(5), session_id) + ';'
                    FROM sys.dm_exec_sessions
                    WHERE database_id = DB_ID('{safe_db_name}');
                    EXEC(@kill);
                """)
                
                # 2. Drop the database
                logger.info(f"Dropping database: {database_name}")
                try:
                    cursor.execute(f"""
                        IF EXISTS (SELECT name FROM sys.databases WHERE name = N'{safe_db_name}')
                        DROP DATABASE [{safe_db_name}]
                    """)
                except Exception as e:
                    logger.warning(f"Could not drop database: {e}")
                
                # 3. Drop the SQL Server login
                logger.info(f"Dropping login: {sql_login}")
                safe_login = sql_login.replace(']', ']]')
                try:
                    cursor.execute(f"""
                        IF EXISTS (SELECT name FROM sys.server_principals WHERE name = N'{safe_login}')
                        DROP LOGIN [{safe_login}]
                    """)
                except Exception as e:
                    logger.warning(f"Could not drop login: {e}")
                
                logger.info(f"Successfully cleaned up sandbox: {database_name}")
                
        except pyodbc.Error as e:
            logger.error(f"Error during sandbox cleanup: {e}")
            # Don't raise - cleanup is best-effort
    
    def _cleanup_failed_provisioning(self, database_name: str, sql_login: str):
        """Cleanup after failed provisioning attempt"""
        try:
            self.cleanup_sandbox_environment(database_name, sql_login)
        except Exception as e:
            logger.error(f"Failed to cleanup after provisioning error: {e}")
    
    def _get_admin_connection(self):
        """Get admin connection to SQL Server with enhanced error handling"""
        try:
            logger.info(f"Attempting connection to SQL Server: {config.DB_SERVER}")
            conn = pyodbc.connect(self.admin_connection_string, timeout=30)
            
            # Test the connection immediately
            cursor = conn.cursor()
            cursor.execute("SELECT @@VERSION")
            version = cursor.fetchone()[0]
            logger.info(f"Connected to SQL Server successfully")
            return conn
            
        except pyodbc.Error as e:
            error_msg = str(e)
            logger.error(f"SQL Server connection failed: {error_msg}")
            logger.error(f"Server: {config.DB_SERVER}, Database: {config.DB_DATABASE}")
            
            # Provide specific error messages
            if "Login failed" in error_msg:
                raise Exception("SQL Server authentication failed. Check credentials or use Windows Authentication.")
            elif "Server not found" in error_msg or "Named Pipes" in error_msg:
                raise Exception(f"Cannot reach SQL Server '{config.DB_SERVER}'. Check server name and network connectivity.")
            elif "timeout" in error_msg.lower():
                raise Exception(f"SQL Server connection timeout. Server '{config.DB_SERVER}' may be unreachable.")
            else:
                raise Exception(f"SQL Server error: {error_msg}")
    
    def verify_sandbox_exists(self, database_name: str) -> bool:
        """Check if a sandbox database exists"""
        try:
            with self._get_admin_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT COUNT(*) as count 
                    FROM sys.databases 
                    WHERE name = ?
                """, (database_name,))
                result = cursor.fetchone()
                return result[0] > 0
        except Exception as e:
            logger.error(f"Error checking sandbox existence: {e}")
            return False
    
    def get_database_size(self, database_name: str) -> Optional[float]:
        """Get database size in MB"""
        try:
            with self._get_admin_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(f"""
                    SELECT 
                        SUM(size) * 8.0 / 1024 as size_mb
                    FROM sys.master_files
                    WHERE database_id = DB_ID('{database_name}')
                """)
                result = cursor.fetchone()
                return result[0] if result else None
        except Exception as e:
            logger.error(f"Error getting database size: {e}")
            return None


# Global instance
provisioner = SQLServerProvisioner()