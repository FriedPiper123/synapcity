from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth
from ..core.firebase import db
from ..models.user import User
from datetime import datetime

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Validate the Authorization header, verify the Firebase ID token and return the
    current user. Falls back to token claims when Firestore is not available
    or the user document does not exist so that authentication still works
    even when Firebase Admin credentials are missing locally."""

    token: str = credentials.credentials

    # Step 1 – verify the Firebase ID token. This step only checks the
    # signature, issuer and audience and therefore does NOT require Admin SDK
    # credentials.
    try:
        decoded_token = auth.verify_id_token(token)
    except Exception:
        # Any failure in verifying the token means the request is unauthenticated.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None

    uid: str = decoded_token.get("uid")

    # Step 2 – try to load the user document from Firestore if credentials are
    # configured. If Firestore is unavailable (e.g. missing service account in
    # local development) we will gracefully fall back to using the claims that
    # are present inside the ID token itself.
    # If Firestore is available, fetch (or create) the user document.
    try:
        if db is not None:
            user_ref = db.collection("users").document(uid)
            snap = user_ref.get()
            if snap.exists:
                user_data = snap.to_dict()
            else:
                # Create a new user document based on token claims.
                user_data = {
                    "username": decoded_token.get("name", uid),
                    "email": decoded_token.get("email", f"{uid}@placeholder.local"),
                    "createdAt": datetime.utcnow(),
                    "profileImageUrl": decoded_token.get("picture"),
                    "subscribedAreas": [],
                }
                user_ref.set(user_data)
            # Ensure uid is present for the Pydantic model.
            user_data["userId"] = uid
            return User(**user_data)
    except Exception:
        # Swallow Firestore-related errors and continue with fallback below.
        pass

    # Step 3 – construct a minimal user model from token claims. This makes
    # sure authenticated requests work even if Firestore is not reachable.
    fallback_user = User(
        userId=uid,
        username=decoded_token.get("name", uid),
        email=decoded_token.get("email", f"{uid}@placeholder.local"),
        createdAt=datetime.utcnow(),
        profileImageUrl=decoded_token.get("picture"),
        subscribedAreas=[],
    )
    return fallback_user

async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    return current_user 