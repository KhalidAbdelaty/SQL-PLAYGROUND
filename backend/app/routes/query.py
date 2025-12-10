from fastapi import APIRouter, HTTPException, Header
from typing import Optional
from app.models import QueryRequest, QueryResponse
from app.services.executor import query_executor
from app.services.validator import query_validator
from app.utils.security import session_manager
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["query"])


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