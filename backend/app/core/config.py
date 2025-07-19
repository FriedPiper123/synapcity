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
    
    class Config:
        env_file = ".env"
        
    @property
    def BACKEND_CORS_ORIGINS_LIST(self) -> List[str]:
        if isinstance(self.BACKEND_CORS_ORIGINS, str):
            return [origin.strip() for origin in self.BACKEND_CORS_ORIGINS.split(",")]
        return self.BACKEND_CORS_ORIGINS

settings = Settings()