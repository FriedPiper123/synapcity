from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from firebase_admin import firestore
from ...core.firebase import db
from ...models.user import User
from ..deps import get_current_active_user

router = APIRouter()

@router.get("/me", response_model=User)
async def read_user_me(current_user: User = Depends(get_current_active_user)):
    return current_user

@router.put("/me/subscribe-area/{area_name}")
async def subscribe_to_area(
    area_name: str,
    current_user: User = Depends(get_current_active_user)
):
    try:
        # Update user's subscribed areas
        user_ref = db.collection('users').document(current_user.userId)
        user_ref.update({
            'subscribedAreas': firestore.ArrayUnion([area_name])
        })
        
        return {"message": f"Successfully subscribed to {area_name}"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.delete("/me/unsubscribe-area/{area_name}")
async def unsubscribe_from_area(
    area_name: str,
    current_user: User = Depends(get_current_active_user)
):
    try:
        # Remove area from user's subscribed areas
        user_ref = db.collection('users').document(current_user.userId)
        user_ref.update({
            'subscribedAreas': firestore.ArrayRemove([area_name])
        })
        
        return {"message": f"Successfully unsubscribed from {area_name}"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        ) 