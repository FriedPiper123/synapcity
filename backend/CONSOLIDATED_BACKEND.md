# SynapCity Backend - Consolidated Code

## Project Structure
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application entry point
│   ├── core/
│   │   └── config.py           # Application configuration
│   └── api/
│       └── v1/
│           ├── __init__.py
│           ├── routes.py       # API v1 routes
│           └── auth.py         # Authentication endpoints
├── scripts/                    # Utility scripts
├── tests/                      # Test files
├── .env                        # Environment variables
├── .env.example                # Example env file
├── setup_firebase.py           # Firebase setup and verification
└── requirements.txt            # Python dependencies
```

## Configuration

### app/core/config.py
```python
from pydantic_settings import BaseSettings
from typing import List, Union

class Settings(BaseSettings):
    # Firebase Configuration
    FIREBASE_PROJECT_ID: str
    FIREBASE_STORAGE_BUCKET: str
    GOOGLE_APPLICATION_CREDENTIALS: str
    
    # JWT Configuration
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # App Configuration
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "SynapCity"
    DEBUG: bool = True
    
    # CORS Configuration
    BACKEND_CORS_ORIGINS: Union[str, List[str]] = "http://localhost:8000"
    
    # AI and External Services Configuration
    GEMINI_API_KEY: str = ""
    FS_CREDENTIAL_JSON: str = ""
    GOOGLE_MAPS_API_KEY: str = ""
    
    class Config:
        env_file = ".env"
        
    @property
    def BACKEND_CORS_ORIGINS_LIST(self) -> List[str]:
        if isinstance(self.BACKEND_CORS_ORIGINS, str):
            return [origin.strip() for origin in self.BACKEND_CORS_ORIGINS.split(",")]
        return self.BACKEND_CORS_ORIGINS

settings = Settings()
```

## Main Application

### app/main.py
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .api.v1 import api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {"message": f"Welcome to {settings.PROJECT_NAME} API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

## API Routes

### app/api/v1/__init__.py
```python
from fastapi import APIRouter
from . import auth, routes

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(routes.router, prefix="/routes", tags=["routes"])
```

### app/api/v1/auth.py
```python
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import Optional
import firebase_admin
from firebase_admin import auth, credentials
import os

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class TokenData(BaseModel):
    uid: str
    email: Optional[str] = None

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        decoded_token = auth.verify_id_token(token)
        return TokenData(uid=decoded_token['uid'], email=decoded_token.get('email'))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

@router.get("/me")
async def read_users_me(current_user: TokenData = Depends(get_current_user)):
    return current_user
```

## Firebase Setup

### setup_firebase.py
```python
#!/usr/bin/env python3
"""
Firebase Setup Verification Script for SynapCity Backend
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

def check_env_file():
    """Check if .env file exists and has required variables"""
    env_path = Path(".env")
    env_example_path = Path(".env.example")
    
    print("🔍 Checking environment configuration...")
    
    if not env_path.exists():
        print("❌ .env file not found!")
        if env_example_path.exists():
            print("💡 Found .env.example file. Please copy it to .env:")
            print("   cp .env.example .env")
        else:
            print("💡 Please create a .env file with the required variables")
        return False
    
    print("✅ .env file found")
    
    # Load environment variables
    load_dotenv()
    
    required_vars = [
        "FIREBASE_PROJECT_ID",
        "FIREBASE_STORAGE_BUCKET", 
        "GOOGLE_APPLICATION_CREDENTIALS"
    ]
    
    missing_vars = []
    for var in required_vars:
        value = os.getenv(var)
        if not value:
            missing_vars.append(var)
        else:
            print(f"✅ {var}: {value}")
    
    if missing_vars:
        print(f"❌ Missing environment variables: {', '.join(missing_vars)}")
        return False
    
    return True

def check_credentials_file():
    """Check if Firebase credentials file exists"""
    print("\n🔍 Checking Firebase credentials...")
    
    creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if not creds_path:
        print("❌ GOOGLE_APPLICATION_CREDENTIALS not set in .env")
        return False
    
    creds_file = Path(creds_path)
    if not creds_file.exists():
        print(f"❌ Credentials file not found: {creds_path}")
        print("\n💡 To fix this:")
        print("1. Go to Firebase Console: https://console.firebase.google.com/")
        print("2. Select your project: synapcity-90985")
        print("3. Go to Project Settings > Service Accounts")
        print("4. Click 'Generate new private key'")
        print("5. Download the JSON file")
        print(f"6. Save it as: {creds_path}")
        return False
    
    print(f"✅ Credentials file found: {creds_path}")
    return True

def test_firebase_connection():
    """Test Firebase connection"""
    print("\n🔍 Testing Firebase connection...")
    
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore
        
        # Initialize Firebase if not already done
        if not firebase_admin._apps:
            cred_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
            if cred_path and os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
            else:
                cred = credentials.ApplicationDefault()
            
            firebase_admin.initialize_app(cred, {
                'projectId': os.getenv('FIREBASE_PROJECT_ID'),
                'storageBucket': os.getenv('FIREBASE_STORAGE_BUCKET')
            })
        
        # Test Firestore connection
        db = firestore.client()
        test_ref = db.collection('_setup_test').document('test')
        test_ref.set({'test': True})
        
        # Read it back
        doc = test_ref.get()
        if doc.exists:
            print("✅ Firestore read/write test successful")
            test_ref.delete()
        else:
            print("❌ Firestore read test failed")
            return False
        
        print("✅ Firebase connection successful!")
        return True
        
    except ImportError as e:
        print(f"❌ Missing Firebase dependencies: {str(e)}")
        print("💡 Install with: pip install firebase-admin")
        return False
    except Exception as e:
        print(f"❌ Firebase connection failed: {str(e)}")
        return False

def check_dependencies():
    """Check if required Python packages are installed"""
    print("\n🔍 Checking Python dependencies...")
    
    required_packages = [
        "fastapi",
        "uvicorn",
        "firebase-admin",
        "python-dotenv",
        "pydantic",
        "httpx",
        "cryptography",
        "python-jose"
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package.replace("-", "_"))
            print(f"✅ {package}")
        except ImportError:
            missing_packages.append(package)
            print(f"❌ {package}")
    
    if missing_packages:
        print(f"\n💡 Install missing packages with:")
        print(f"   pip install {' '.join(missing_packages)}")
        return False
    
    return True

def main():
    """Main setup verification function"""
    print("🚀 SynapCity Backend Setup Verification")
    print("=" * 50)
    
    checks = [
        ("Environment Configuration", check_env_file),
        ("Python Dependencies", check_dependencies),
        ("Firebase Credentials", check_credentials_file),
        ("Firebase Connection", test_firebase_connection)
    ]
    
    all_passed = True
    
    for check_name, check_func in checks:
        print(f"\n📋 {check_name}")
        print("-" * 30)
        if not check_func():
            all_passed = False
    
    if all_passed:
        print("\n🎉 All checks passed! Your backend is properly configured.")
    else:
        print("\n❌ Some checks failed. Please address the issues above.")
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())
```

## Environment Setup

### .env.example
```
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
GOOGLE_APPLICATION_CREDENTIALS=path/to/your/firebase-credentials.json

# JWT Configuration
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS Configuration
BACKEND_CORS_ORIGINS=http://localhost:3000,http://localhost:8000

# External Services
GEMINI_API_KEY=your-gemini-api-key
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

## Running the Application

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

3. Run the FastAPI server:
   ```bash
   uvicorn app.main:app --reload
   ```

4. Verify the setup:
   ```bash
   python setup_firebase.py
   ```

5. Access the API documentation at: http://localhost:8000/docs

## Dependencies

### requirements.txt
```
fastapi>=0.68.0
uvicorn>=0.15.0
firebase-admin>=5.0.0
python-dotenv>=0.19.0
pydantic>=1.8.0
httpx>=0.19.0
python-jose[cryptography]>=3.3.0
pytest>=6.2.5
pytest-asyncio>=0.15.1
```

This consolidated file provides a comprehensive overview of the SynapCity backend codebase, including configuration, main application, API routes, and setup instructions. The code is organized by file and includes all necessary components to understand and run the backend service.
