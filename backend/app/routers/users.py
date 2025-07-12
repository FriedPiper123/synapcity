from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from datetime import datetime
from .. import models, dependencies
from ..database import firebase_service
from ..exceptions import UserNotFound
from ..auth import auth_service

router = APIRouter(
    prefix="/users",
    tags=["users"],
    responses={404: {"description": "Not found"}},
)

@router.post("/", response_model=models.User, status_code=status.HTTP_201_CREATED)
async def create_user(user: models.UserCreate, current_user: models.User = Depends(auth_service.get_current_user)):
    """Create a new user profile"""
    try:
        # Check if user already exists
        existing_user = await firebase_service.get_user_by_uid(current_user.userId)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already exists"
            )
        
        # Create user data
        user_data = user.dict()
        user_data["userId"] = current_user.userId
        user_data["createdAt"] = datetime.utcnow()
        
        # Save to Firestore
        await firebase_service.create_user(user_data)
        return user_data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/me", response_model=models.User)
async def get_current_user_profile(current_user: models.User = Depends(dependencies.get_current_user)):
    """Get current user's profile"""
    return current_user

@router.patch("/me", response_model=models.User)
async def update_user_profile(
    user_update: models.UserUpdate,
    current_user: models.User = Depends(dependencies.get_current_user)
):
    """Update current user's profile"""
    try:
        # Get current user data
        user_data = current_user.dict()
        
        # Update fields if provided
        update_data = user_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            if value is not None:
                user_data[field] = value
        
        # Save updated user data
        await firebase_service.create_user(user_data)
        return user_data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/{user_id}", response_model=models.User)
async def get_user_by_id(user_id: str):
    """Get user by ID"""
    try:
        user = await firebase_service.get_user_by_uid(user_id)
        if not user:
            raise UserNotFound(user_id)
        return user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
