from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    """Schema for creating new users"""
    username: str = Field(..., min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    password: str = Field(..., min_length=8)
    role: str = Field(default="sandbox")  # admin or sandbox


class UserLogin(BaseModel):
    """Schema for user login"""
    username: str
    password: str


class UserResponse(BaseModel):
    """Schema for user response (without password)"""
    user_id: int
    username: str
    email: Optional[str]
    role: str
    created_at: datetime
    database_name: Optional[str] = None
    sql_login: Optional[str] = None


class SessionResponse(BaseModel):
    """Schema for session response"""
    token: str
    user: UserResponse
    expires_at: datetime


class SessionExtendRequest(BaseModel):
    """Schema for extending session"""
    hours: int = Field(default=8, ge=1, le=24)


class CleanupRequest(BaseModel):
    """Schema for cleanup confirmation"""
    cleanup: bool = Field(default=True)
    session_id: Optional[str] = None


class AdminSetupRequest(BaseModel):
    """Schema for first-time admin setup"""
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)
    setup_key: str = Field(..., description="Special key for first-time setup")