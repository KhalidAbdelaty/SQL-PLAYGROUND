from fastapi import APIRouter, HTTPException
from typing import Optional
import re
from app.models import SchemaResponse, DatabaseInfo, TableDetailsRequest, TableDetailsResponse
from app.database import db_manager
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["schema"])


@router.get("/databases")
async def get_databases():
    """
    Get list of all databases on the server
    
    Returns list of databases with name, size, and creation date
    """
    try:
        databases = db_manager.get_databases()
        return {"databases": databases}
    except Exception as e:
        logger.error(f"Error fetching databases: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/schema/{database}")
async def get_database_schema(database: str):
    """
    Get schema information for a specific database
    
    - **database**: Name of the database
    
    Returns tables and views with their schemas
    """
    try:
        schema_info = db_manager.get_schema(database)
        return schema_info
    except Exception as e:
        logger.error(f"Error fetching schema for {database}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/table-details", response_model=TableDetailsResponse)
async def get_table_details(request: TableDetailsRequest):
    """
    Get detailed information about a specific table
    
    - **database**: Database name
    - **schema**: Schema name (default: dbo)
    - **table**: Table name
    
    Returns column definitions, indexes, and foreign keys
    """
    try:
        # Validate identifiers to prevent injection via object names
        def _is_valid_identifier(name: str) -> bool:
            return bool(re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", name))

        if not _is_valid_identifier(request.schema) or not _is_valid_identifier(request.table):
            raise HTTPException(status_code=400, detail="Invalid schema or table name")
        # Get column information
        columns = db_manager.get_table_columns(
            request.database,
            request.schema,
            request.table
        )
        
        # Get row count
        count_query = f"SELECT COUNT(*) as cnt FROM [{request.schema}].[{request.table}]"
        rows, _, _ = db_manager.execute_query(count_query, request.database)
        row_count = rows[0][0] if rows else 0
        
        # Get indexes (basic information)
        index_query = f"""
        SELECT 
            i.name as index_name,
            i.type_desc as index_type,
            i.is_unique,
            i.is_primary_key
        FROM sys.indexes i
        INNER JOIN sys.objects o ON i.object_id = o.object_id
        INNER JOIN sys.schemas s ON o.schema_id = s.schema_id
        WHERE o.name = '{request.table}'
            AND s.name = '{request.schema}'
            AND i.name IS NOT NULL
        """
        index_rows, index_cols, _ = db_manager.execute_query(index_query, request.database)
        
        indexes = []
        if index_rows:
            for row in index_rows:
                indexes.append({
                    "name": row[0],
                    "type": row[1],
                    "is_unique": bool(row[2]),
                    "is_primary_key": bool(row[3])
                })
        
        # Get foreign keys
        fk_query = f"""
        SELECT 
            fk.name as constraint_name,
            c.name as column_name,
            OBJECT_NAME(fk.referenced_object_id) as referenced_table,
            rc.name as referenced_column
        FROM sys.foreign_keys fk
        INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
        INNER JOIN sys.columns c ON fkc.parent_object_id = c.object_id AND fkc.parent_column_id = c.column_id
        INNER JOIN sys.columns rc ON fkc.referenced_object_id = rc.object_id AND fkc.referenced_column_id = rc.column_id
        INNER JOIN sys.objects o ON fk.parent_object_id = o.object_id
        INNER JOIN sys.schemas s ON o.schema_id = s.schema_id
        WHERE o.name = '{request.table}'
            AND s.name = '{request.schema}'
        """
        fk_rows, fk_cols, _ = db_manager.execute_query(fk_query, request.database)
        
        foreign_keys = []
        if fk_rows:
            for row in fk_rows:
                foreign_keys.append({
                    "constraint_name": row[0],
                    "column": row[1],
                    "referenced_table": row[2],
                    "referenced_column": row[3]
                })
        
        return TableDetailsResponse(
            table_name=request.table,
            schema_name=request.schema,
            columns=columns,
            row_count=row_count,
            indexes=indexes,
            foreign_keys=foreign_keys
        )
    
    except Exception as e:
        logger.error(f"Error fetching table details: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/connection-test")
async def test_connection():
    """
    Test database connection
    
    Returns connection status and server information
    """
    try:
        result = db_manager.test_connection()
        return result
    except Exception as e:
        logger.error(f"Connection test failed: {e}")
        return {
            "connected": False,
            "error": str(e)
        }