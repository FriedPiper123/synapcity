from fastapi import APIRouter, HTTPException, status
from typing import List
from ..models import AreaData
from ..database import firebase_service

router = APIRouter(
    prefix="/areas",
    tags=["areas"],
    responses={404: {"description": "Not found"}},
)

@router.get("/{area_name}", response_model=AreaData)
async def get_area_data(area_name: str):
    """Get area statistics and trends"""
    try:
        area_data = await firebase_service.get_area_data(area_name)
        if not area_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Area '{area_name}' not found"
            )
        return area_data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
