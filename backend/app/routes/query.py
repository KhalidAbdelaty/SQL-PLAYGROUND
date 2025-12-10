from fastapi import APIRouter, HTTPException, Header, Depends, Request
from typing import Optional, List
from pydantic import BaseModel
from app.models import QueryRequest, QueryResponse
from app.services.executor import query_executor
from app.services.validator import query_validator
from app.services.cache import query_cache
from app.services.formatter import query_formatter
from app.services.saved_queries import saved_queries_service
from app.utils.security import session_manager
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["query"])


# Request/Response models for new endpoints
class FormatRequest(BaseModel):
    query: str
    keyword_case: str = "upper"
    identifier_case: Optional[str] = None
    indent_width: int = 4
    strip_comments: bool = False


class SaveQueryRequest(BaseModel):
    name: str
    query: str
    description: Optional[str] = None
    database_name: Optional[str] = None
    tags: Optional[List[str]] = None
    is_favorite: bool = False


class UpdateQueryRequest(BaseModel):
    name: Optional[str] = None
    query: Optional[str] = None
    description: Optional[str] = None
    database_name: Optional[str] = None
    tags: Optional[List[str]] = None
    is_favorite: Optional[bool] = None


@router.post("/execute", response_model=QueryResponse)
async def execute_query(
    request: QueryRequest,
    x_session_id: Optional[str] = Header(None)
):
    """
    Execute SQL query
    
    - **query**: SQL query to execute
    - **database**: Optional target database
    - **session_id**: Optional session identifier (can be in header or body)
    - **confirm_destructive**: Set to true to execute dangerous operations
    """
    session_id = x_session_id or request.session_id
    
    # Create session if not exists
    if not session_id:
        session_id = session_manager.create_session()
    elif not session_manager.validate_session(session_id):
        session_id = session_manager.create_session()
    
    # Update session activity
    session_manager.update_activity(session_id)
    
    try:
        # Check if query contains multiple statements
        statements = query_validator.split_statements(request.query)
        
        if len(statements) > 1:
            # Execute multiple statements
            results = await query_executor.execute_multiple(
                queries=statements,
                database=request.database,
                session_id=session_id,
                confirm_destructive=request.confirm_destructive
            )
            
            # Return combined result
            # If any failed, return first failure
            for result in results:
                if not result.get("success"):
                    session_manager.add_to_history(session_id, request.query, result)
                    return QueryResponse(**result)
            
            # All succeeded, return last result
            last_result = results[-1]
            session_manager.add_to_history(session_id, request.query, last_result)
            return QueryResponse(**last_result, message=f"Executed {len(statements)} statement(s) successfully")
        
        else:
            # Execute single statement
            result = await query_executor.execute(
                query=request.query,
                database=request.database,
                session_id=session_id,
                confirm_destructive=request.confirm_destructive
            )
            
            # Add to history
            session_manager.add_to_history(session_id, request.query, result)
            
            return QueryResponse(**result)
    
    except Exception as e:
        logger.error(f"Unexpected error in execute_query: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
async def get_query_history(
    x_session_id: Optional[str] = Header(None),
    limit: Optional[int] = 50
):
    """
    Get query history for current session
    
    - **limit**: Maximum number of history items to return
    """
    if not x_session_id:
        return {"history": []}
    
    # Ensure session exists - if client has a session ID but server doesn't know it yet,
    # initialize it rather than returning empty history
    if x_session_id not in session_manager.sessions:
        # Client has a session ID but server doesn't know about it yet
        # This happens when: 1) server restarted, 2) first history poll before first query
        # Create the session so history can accumulate
        from datetime import datetime
        session_manager.sessions[x_session_id] = {
            "created_at": datetime.now(),
            "last_activity": datetime.now(),
            "query_count": 0
        }
        session_manager.query_history[x_session_id] = []
        return {"history": []}
    
    # Validate session hasn't expired
    if not session_manager.validate_session(x_session_id):
        return {"history": []}
    
    history = session_manager.get_history(x_session_id, limit)
    return {"history": history}


@router.delete("/history")
async def clear_query_history(
    x_session_id: Optional[str] = Header(None)
):
    """Clear query history for current session"""
    if not x_session_id:
        return {"message": "No session found"}
    
    if x_session_id in session_manager.query_history:
        session_manager.query_history[x_session_id] = []
    
    return {"message": "History cleared"}


@router.get("/session")
async def get_session_info(
    x_session_id: Optional[str] = Header(None)
):
    """Get current session information"""
    if not x_session_id:
        # Create new session
        session_id = session_manager.create_session()
        return {
            "session_id": session_id,
            "created": True
        }
    
    if not session_manager.validate_session(x_session_id):
        # Create new session
        session_id = session_manager.create_session()
        return {
            "session_id": session_id,
            "created": True
        }
    
    info = session_manager.get_session_info(x_session_id)
    return {
        "session_id": x_session_id,
        "created": False,
        "info": info
    }


# ============================================
# Query Formatting Endpoints
# ============================================

@router.post("/query/format")
async def format_query(request: FormatRequest):
    """
    Format/beautify SQL query
    
    - **query**: SQL query to format
    - **keyword_case**: 'upper', 'lower', or 'capitalize'
    - **identifier_case**: 'upper', 'lower', or null (unchanged)
    - **indent_width**: Number of spaces for indentation
    - **strip_comments**: Whether to remove comments
    """
    result = query_formatter.format(
        query=request.query,
        keyword_case=request.keyword_case,
        identifier_case=request.identifier_case,
        indent_width=request.indent_width,
        strip_comments=request.strip_comments
    )
    return result


@router.post("/query/minify")
async def minify_query(request: FormatRequest):
    """Minify SQL query (remove extra whitespace and comments)"""
    result = query_formatter.minify(request.query)
    return result


@router.post("/query/analyze")
async def analyze_query(request: FormatRequest):
    """Analyze SQL query structure"""
    result = query_formatter.analyze(request.query)
    return result


# ============================================
# Cache Management Endpoints
# ============================================

@router.get("/cache/stats")
async def get_cache_stats():
    """Get query cache statistics"""
    return query_cache.get_stats()


@router.delete("/cache")
async def clear_cache(database: Optional[str] = None):
    """Clear query cache"""
    count = query_cache.invalidate(database)
    return {"message": f"Cleared {count} cached entries", "count": count}


# ============================================
# Saved Queries Endpoints
# ============================================

@router.get("/query/saved")
async def get_saved_queries(
    request: Request,
    favorites_only: bool = False,
    search: Optional[str] = None,
    limit: int = 50
):
    """Get user's saved queries"""
    # Get user from request state (set by auth middleware)
    user = getattr(request.state, 'user', None)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    queries = saved_queries_service.get_user_queries(
        user_id=user['user_id'],
        favorites_only=favorites_only,
        search=search,
        limit=limit
    )
    return {"queries": queries, "count": len(queries)}


@router.post("/query/saved")
async def save_query(
    request: Request,
    body: SaveQueryRequest
):
    """Save a query template"""
    user = getattr(request.state, 'user', None)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    saved = saved_queries_service.save_query(
        user_id=user['user_id'],
        name=body.name,
        query=body.query,
        description=body.description,
        database_name=body.database_name,
        tags=body.tags,
        is_favorite=body.is_favorite
    )
    return {"message": "Query saved", "query": saved}


@router.get("/query/saved/{query_id}")
async def get_saved_query(
    request: Request,
    query_id: int
):
    """Get a specific saved query"""
    user = getattr(request.state, 'user', None)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    query = saved_queries_service.get_query(query_id)
    if not query or query['user_id'] != user['user_id']:
        raise HTTPException(status_code=404, detail="Query not found")
    
    return query


@router.put("/query/saved/{query_id}")
async def update_saved_query(
    request: Request,
    query_id: int,
    body: UpdateQueryRequest
):
    """Update a saved query"""
    user = getattr(request.state, 'user', None)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    updated = saved_queries_service.update_query(
        query_id=query_id,
        user_id=user['user_id'],
        name=body.name,
        description=body.description,
        query=body.query,
        database_name=body.database_name,
        tags=body.tags,
        is_favorite=body.is_favorite
    )
    
    if not updated:
        raise HTTPException(status_code=404, detail="Query not found")
    
    return {"message": "Query updated", "query": updated}


@router.delete("/query/saved/{query_id}")
async def delete_saved_query(
    request: Request,
    query_id: int
):
    """Delete a saved query"""
    user = getattr(request.state, 'user', None)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    deleted = saved_queries_service.delete_query(query_id, user['user_id'])
    if not deleted:
        raise HTTPException(status_code=404, detail="Query not found")
    
    return {"message": "Query deleted"}


@router.post("/query/saved/{query_id}/favorite")
async def toggle_favorite(
    request: Request,
    query_id: int
):
    """Toggle favorite status for a saved query"""
    user = getattr(request.state, 'user', None)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    updated = saved_queries_service.toggle_favorite(query_id, user['user_id'])
    if not updated:
        raise HTTPException(status_code=404, detail="Query not found")
    
    return {"message": "Favorite toggled", "is_favorite": updated['is_favorite']}