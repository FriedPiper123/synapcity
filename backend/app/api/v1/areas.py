from fastapi import APIRouter, HTTPException, status
from typing import List
from ...core.firebase import db
from ...models.area import Area

router = APIRouter()

@router.get("/", response_model=List[Area])
async def get_all_areas():
    try:
        areas = []
        for doc in db.collection('areas').stream():
            area_data = doc.to_dict()
            area_data['name'] = doc.id
            areas.append(Area(**area_data))
        
        return areas
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/{area_name}", response_model=Area)
async def get_area(area_name: str):
    try:
        area_doc = db.collection('areas').document(area_name).get()
        
        if not area_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Area not found"
            )
        
        area_data = area_doc.to_dict()
        area_data['name'] = area_doc.id
        
        return Area(**area_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        ) 