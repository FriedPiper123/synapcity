from fastapi import APIRouter, HTTPException, status
from firebase_admin import auth
from pydantic import BaseModel
from ...core.firebase import db
from ...models.user import UserCreate, User
from datetime import datetime

router = APIRouter()

class TokenResponse(BaseModel):
    userId: str
    customToken: str
    message: str

class TokenVerifyRequest(BaseModel):
    token: str

class TokenVerifyResponse(BaseModel):
    valid: bool
    uid: str

@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    try:
        # Create user in Firebase Auth
        user_record = auth.create_user(
            email=user_data.email,
            password=user_data.password,
            display_name=user_data.username
        )
        
        # Create user document in Firestore
        user_doc = {
            "username": user_data.username,
            "email": user_data.email,
            "createdAt": datetime.utcnow(),
            "profileImageUrl": None,
            "subscribedAreas": []
        }
        
        db.collection('users').document(user_record.uid).set(user_doc)
        
        # Generate custom token
        custom_token = auth.create_custom_token(user_record.uid)
        
        return TokenResponse(
            userId=user_record.uid,
            customToken=custom_token.decode('utf-8') if isinstance(custom_token, bytes) else custom_token,
            message="User registered successfully"
        )
        
    except auth.EmailAlreadyExistsError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/token/verify", response_model=TokenVerifyResponse)
async def verify_token(request: TokenVerifyRequest):
    try:
        decoded_token = auth.verify_id_token(request.token)
        return TokenVerifyResponse(valid=True, uid=decoded_token['uid'])
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        ) 