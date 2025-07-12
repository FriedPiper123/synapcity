from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth
from .config import settings
from .database import firebase_service
from .models import User
import structlog

logger = structlog.get_logger()

security = HTTPBearer()

class AuthService:
    def __init__(self):
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    async def verify_firebase_token(self, token: str) -> Optional[dict]:
        """Verify Firebase ID token"""
        try:
            decoded_token = auth.verify_id_token(token)
            return decoded_token
        except Exception as e:
            logger.error("Firebase token verification failed", error=str(e))
            return None

    async def get_current_user(self, credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
        """Get current authenticated user"""
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

        try:
            # Verify Firebase token
            decoded_token = await self.verify_firebase_token(credentials.credentials)
            if not decoded_token:
                raise credentials_exception

            uid = decoded_token.get("uid")
            if not uid:
                raise credentials_exception

            # Get user from database
            user_data = await firebase_service.get_user_by_uid(uid)
            if not user_data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )

            return User(**user_data)
        except JWTError:
            raise credentials_exception
        except Exception as e:
            logger.error("Error in get_current_user", error=str(e))
            raise credentials_exception

auth_service = AuthService()
