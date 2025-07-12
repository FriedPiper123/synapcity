from fastapi import Depends
from .auth import auth_service
from .models import User

# Dependency to get current user
get_current_user = auth_service.get_current_user
