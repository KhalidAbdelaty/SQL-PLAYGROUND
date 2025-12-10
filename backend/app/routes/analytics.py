"""
Analytics endpoints for usage statistics
"""
from fastapi import APIRouter, Depends, Request
from app.auth.middleware import get_current_user
from app.services.analytics import analytics_service
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/statistics")
async def get_statistics(
    days: int = 7,
    user: dict = Depends(get_current_user)
):
    """
    Get usage statistics for the last N days
    
    Only available to admin users
    """
    if user['role'] != 'admin':
        return {"error": "Admin access required"}
    
    stats = analytics_service.get_query_statistics(days)
    return stats


@router.get("/popular-features")
async def get_popular_features(
    days: int = 7,
    user: dict = Depends(get_current_user)
):
    """
    Get most popular features
    
    Only available to admin users
    """
    if user['role'] != 'admin':
        return {"error": "Admin access required"}
    
    features = analytics_service.get_popular_features(days)
    return {"features": features}

