from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict
import json
import logging
from app.services.executor import query_executor
from app.services.validator import query_validator
from app.utils.security import session_manager

logger = logging.getLogger(__name__)
router = APIRouter()


class ConnectionManager:
    """Manages WebSocket connections"""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, session_id: str):
        """Accept and store WebSocket connection"""
        await websocket.accept()
        self.active_connections[session_id] = websocket
        logger.info(f"WebSocket connected: {session_id}")
    
    def disconnect(self, session_id: str):
        """Remove WebSocket connection"""
        if session_id in self.active_connections:
            del self.active_connections[session_id]
            logger.info(f"WebSocket disconnected: {session_id}")
    
    async def send_message(self, session_id: str, message: dict):
        """Send message to specific client"""
        if session_id in self.active_connections:
            try:
                await self.active_connections[session_id].send_json(message)
            except Exception as e:
                logger.error(f"Error sending message to {session_id}: {e}")
                self.disconnect(session_id)


manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time query execution
    
    Message format:
    {
        "action": "execute" | "cancel" | "ping",
        "session_id": "session-uuid",
        "query": "SQL query",
        "database": "database name",
        "confirm_destructive": false
    }
    
    Response format:
    {
        "type": "result" | "error" | "progress" | "pong",
        "data": {...}
    }
    """
    session_id = None
    
    try:
        # Wait for initial message with session_id
        initial_data = await websocket.receive_json()
        session_id = initial_data.get("session_id")
        
        if not session_id:
            session_id = session_manager.create_session()
            await websocket.send_json({
                "type": "session_created",
                "session_id": session_id
            })
        
        # Connect websocket
        await manager.connect(websocket, session_id)
        
        # Validate or create session
        if not session_manager.validate_session(session_id):
            session_manager.create_session()
        
        # Send connection confirmation
        await manager.send_message(session_id, {
            "type": "connected",
            "session_id": session_id,
            "message": "WebSocket connected successfully"
        })
        
        # Message handling loop
        while True:
            try:
                data = await websocket.receive_json()
                action = data.get("action")
                
                if action == "ping":
                    # Health check
                    await manager.send_message(session_id, {
                        "type": "pong",
                        "timestamp": data.get("timestamp")
                    })
                
                elif action == "execute":
                    # Execute query
                    query = data.get("query")
                    database = data.get("database")
                    confirm_destructive = data.get("confirm_destructive", False)
                    
                    if not query:
                        await manager.send_message(session_id, {
                            "type": "error",
                            "error": "Query is required"
                        })
                        continue
                    
                    # Update session activity
                    session_manager.update_activity(session_id)
                    
                    # Send execution started message
                    await manager.send_message(session_id, {
                        "type": "progress",
                        "message": "Executing query..."
                    })
                    
                    # Execute query
                    result = await query_executor.execute(
                        query=query,
                        database=database,
                        session_id=session_id,
                        confirm_destructive=confirm_destructive
                    )
                    
                    # Add to history
                    session_manager.add_to_history(session_id, query, result)
                    
                    # Send result
                    await manager.send_message(session_id, {
                        "type": "result",
                        "data": result
                    })
                
                elif action == "cancel":
                    # Cancel active query (placeholder - full implementation would need query cancellation)
                    await manager.send_message(session_id, {
                        "type": "info",
                        "message": "Query cancellation requested"
                    })
                
                else:
                    await manager.send_message(session_id, {
                        "type": "error",
                        "error": f"Unknown action: {action}"
                    })
            
            except json.JSONDecodeError:
                await manager.send_message(session_id, {
                    "type": "error",
                    "error": "Invalid JSON message"
                })
            
            except Exception as e:
                logger.error(f"Error processing WebSocket message: {e}")
                await manager.send_message(session_id, {
                    "type": "error",
                    "error": str(e)
                })
    
    except WebSocketDisconnect:
        if session_id:
            manager.disconnect(session_id)
            logger.info(f"Client disconnected: {session_id}")
    
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        if session_id:
            manager.disconnect(session_id)