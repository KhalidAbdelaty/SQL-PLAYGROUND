from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


class QueryRequest(BaseModel):
    """Request model for SQL query execution"""
    query: str = Field(..., min_length=1, description="SQL query to execute")
    database: Optional[str] = Field(None, description="Target database name")
    session_id: Optional[str] = Field(None, description="User session identifier")
    confirm_destructive: bool = Field(False, description="User confirmed destructive operation")


class QueryResponse(BaseModel):
    """Response model for query execution"""
    success: bool
    data: Optional[List[Dict[str, Any]]] = None
    columns: Optional[List[str]] = None
    row_count: int = 0
    execution_time: float = 0.0
    message: Optional[str] = None
    error: Optional[str] = None
    requires_confirmation: bool = False
    warning: Optional[str] = None


class SchemaTable(BaseModel):
    """Model for database table metadata"""
    name: str
    schema: str
    type: str  # 'TABLE' or 'VIEW'
    row_count: Optional[int] = None


class SchemaColumn(BaseModel):
    """Model for table column metadata"""
    name: str
    data_type: str
    is_nullable: bool
    max_length: Optional[int] = None
    is_primary_key: bool = False
    is_foreign_key: bool = False


class SchemaResponse(BaseModel):
    """Response model for schema information"""
    database: str
    tables: List[SchemaTable]
    views: List[SchemaTable]


class DatabaseInfo(BaseModel):
    """Model for database information"""
    name: str
    size_mb: Optional[float] = None
    created_date: Optional[datetime] = None


class QueryHistoryItem(BaseModel):
    """Model for query history entry"""
    id: str
    query: str
    database: str
    timestamp: datetime
    execution_time: float
    row_count: int
    success: bool
    error: Optional[str] = None


class ExportRequest(BaseModel):
    """Request model for data export"""
    query: str
    format: str = Field(..., pattern="^(csv|json|excel)$")
    database: Optional[str] = None


class ConnectionTestResponse(BaseModel):
    """Response model for connection test"""
    connected: bool
    server: str
    database: str
    version: Optional[str] = None
    error: Optional[str] = None


class TableDetailsRequest(BaseModel):
    """Request model for table details"""
    database: str
    schema: str = "dbo"
    table: str


class TableDetailsResponse(BaseModel):
    """Response model for table details"""
    table_name: str
    schema_name: str
    columns: List[SchemaColumn]
    row_count: int
    indexes: List[Dict[str, Any]]
    foreign_keys: List[Dict[str, Any]]