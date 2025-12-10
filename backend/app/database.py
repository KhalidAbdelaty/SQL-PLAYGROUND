import pyodbc
from typing import Optional, List, Tuple, Any
import logging
from contextlib import contextmanager
import config

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DatabaseManager:
    """Manages database connections and executions with connection pooling"""
    
    def __init__(self):
        self.connection_string = config.CONNECTION_STRING
        # Enable connection pooling
        pyodbc.pooling = True
        self._test_connection()
    
    def _test_connection(self):
        """Test database connection on initialization"""
        try:
            conn = pyodbc.connect(self.connection_string, timeout=5)
            conn.close()
            logger.info(f"Successfully connected to {config.DB_SERVER}")
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise
    
    @contextmanager
    def get_connection(self, database: Optional[str] = None):
        """
        Context manager for database connections
        
        Args:
            database: Optional database name to connect to
            
        Yields:
            pyodbc.Connection: Database connection
        """
        conn_str = self.connection_string
        if database:
            # Replace database in connection string
            conn_str = conn_str.replace(
                f"DATABASE={config.DB_DATABASE}",
                f"DATABASE={database}"
            )
        
        conn = None
        try:
            conn = pyodbc.connect(conn_str, timeout=10)
            conn.timeout = config.MAX_EXECUTION_TIME
            yield conn
        except Exception as e:
            logger.error(f"Connection error: {e}")
            raise
        finally:
            if conn:
                try:
                    conn.close()
                except:
                    pass
    
    def execute_query(
        self, 
        query: str, 
        database: Optional[str] = None,
        fetch_results: bool = True
    ) -> Tuple[Optional[List[Tuple]], Optional[List[str]], int]:
        """
        Execute SQL query and return results
        
        Args:
            query: SQL query to execute
            database: Optional database to execute against
            fetch_results: Whether to fetch and return results
            
        Returns:
            Tuple of (rows, column_names, row_count)
        """
        with self.get_connection(database) as conn:
            cursor = conn.cursor()
            
            try:
                # Set query timeout
                cursor.execute(f"SET LOCK_TIMEOUT {config.MAX_EXECUTION_TIME * 1000}")
                
                # Check if this is a CREATE/DROP DATABASE statement
                # These statements cannot be executed in a transaction
                query_upper = query.strip().upper()
                needs_autocommit = (
                    query_upper.startswith('CREATE DATABASE') or 
                    query_upper.startswith('DROP DATABASE') or
                    query_upper.startswith('ALTER DATABASE') or
                    'CREATE DATABASE' in query_upper or
                    'DROP DATABASE' in query_upper
                )
                
                # For CREATE/DROP DATABASE, set autocommit mode
                if needs_autocommit:
                    conn.autocommit = True
                
                # Execute query
                cursor.execute(query)
                
                # Check if query returns results (SELECT, SHOW, etc.)
                if cursor.description and fetch_results:
                    # Get column names
                    columns = [column[0] for column in cursor.description]
                    
                    # Fetch rows with limit
                    rows = cursor.fetchmany(config.MAX_RESULT_ROWS)
                    
                    # Check if more rows exist
                    has_more = cursor.fetchone() is not None
                    
                    row_count = len(rows)
                    if has_more:
                        logger.warning(f"Result truncated to {config.MAX_RESULT_ROWS} rows")
                    
                    return rows, columns, row_count
                else:
                    # For INSERT, UPDATE, DELETE, etc.
                    # Only commit if not in autocommit mode
                    if not needs_autocommit:
                        conn.commit()
                    row_count = cursor.rowcount
                    return None, None, row_count
                    
            except pyodbc.Error as e:
                # Only rollback if not in autocommit mode
                if not needs_autocommit:
                    conn.rollback()
                raise
            finally:
                cursor.close()
    
    def get_databases(self) -> List[dict]:
        """Get list of all databases"""
        query = """
        SELECT 
            d.name,
            d.create_date,
            CAST(SUM(mf.size) * 8. / 1024 AS DECIMAL(10,2)) as size_mb
        FROM sys.databases d
        LEFT JOIN sys.master_files mf ON d.database_id = mf.database_id
        WHERE d.database_id > 4  -- Exclude system databases
        GROUP BY d.name, d.create_date
        ORDER BY d.name
        """
        
        try:
            rows, columns, _ = self.execute_query(query)
            return [dict(zip(columns, row)) for row in rows]
        except Exception as e:
            logger.error(f"Error fetching databases: {e}")
            return []
    
    def get_schema(self, database: str) -> dict:
        """
        Get schema information for a database
        
        Args:
            database: Database name
            
        Returns:
            Dictionary with tables and views information
        """
        query = """
        SELECT 
            TABLE_SCHEMA,
            TABLE_NAME,
            TABLE_TYPE
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_TYPE IN ('BASE TABLE', 'VIEW')
        ORDER BY TABLE_TYPE, TABLE_SCHEMA, TABLE_NAME
        """
        
        try:
            rows, columns, _ = self.execute_query(query, database)
            
            tables = []
            views = []
            
            for row in rows:
                schema, name, table_type = row
                item = {
                    "schema": schema,
                    "name": name,
                    "type": "TABLE" if table_type == "BASE TABLE" else "VIEW"
                }
                
                if table_type == "BASE TABLE":
                    tables.append(item)
                else:
                    views.append(item)
            
            return {
                "database": database,
                "tables": tables,
                "views": views
            }
        except Exception as e:
            logger.error(f"Error fetching schema: {e}")
            raise
    
    def get_table_columns(self, database: str, schema: str, table: str) -> List[dict]:
        """Get column information for a specific table"""
        query = """
        SELECT 
            c.COLUMN_NAME,
            c.DATA_TYPE,
            c.IS_NULLABLE,
            c.CHARACTER_MAXIMUM_LENGTH,
            CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END as IS_PRIMARY_KEY,
            CASE WHEN fk.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END as IS_FOREIGN_KEY
        FROM INFORMATION_SCHEMA.COLUMNS c
        LEFT JOIN (
            SELECT ku.COLUMN_NAME
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
            JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku 
                ON tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
            WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
                AND ku.TABLE_SCHEMA = ?
                AND ku.TABLE_NAME = ?
        ) pk ON c.COLUMN_NAME = pk.COLUMN_NAME
        LEFT JOIN (
            SELECT ku.COLUMN_NAME
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
            JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku 
                ON tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
            WHERE tc.CONSTRAINT_TYPE = 'FOREIGN KEY'
                AND ku.TABLE_SCHEMA = ?
                AND ku.TABLE_NAME = ?
        ) fk ON c.COLUMN_NAME = fk.COLUMN_NAME
        WHERE c.TABLE_SCHEMA = ?
            AND c.TABLE_NAME = ?
        ORDER BY c.ORDINAL_POSITION
        """
        
        with self.get_connection(database) as conn:
            cursor = conn.cursor()
            cursor.execute(query, (schema, table, schema, table, schema, table))
            
            columns = []
            for row in cursor.fetchall():
                columns.append({
                    "name": row[0],
                    "data_type": row[1],
                    "is_nullable": row[2] == "YES",
                    "max_length": row[3],
                    "is_primary_key": bool(row[4]),
                    "is_foreign_key": bool(row[5])
                })
            
            return columns
    
    def test_connection(self) -> dict:
        """Test database connection and return server info"""
        try:
            query = "SELECT @@VERSION as version, @@SERVERNAME as server, DB_NAME() as db_name"
            rows, columns, _ = self.execute_query(query)
            
            if rows:
                result = dict(zip(columns, rows[0]))
                return {
                    "connected": True,
                    "server": result.get("server"),
                    "database": result.get("db_name"),
                    "version": result.get("version")
                }
        except Exception as e:
            return {
                "connected": False,
                "error": str(e)
            }


# Global database manager instance
db_manager = DatabaseManager()