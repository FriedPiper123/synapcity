from fastapi import APIRouter
from .auth import router as auth_router
from .users import router as users_router
from .posts import router as posts_router
from .comments import router as comments_router
# from .areas import router as areas_router
from .insights import router as insights_router
from .location_posts import router as location_posts_router
from .dashboard import router as dashboard_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(users_router, prefix="/users", tags=["users"])
api_router.include_router(posts_router, prefix="/posts", tags=["posts"])
api_router.include_router(comments_router, prefix="/posts", tags=["comments"])
# api_router.include_router(areas_router, prefix="/areas", tags=["areas"])
api_router.include_router(insights_router, prefix="/insights", tags=["insights"])
api_router.include_router(location_posts_router, prefix="/location", tags=["location"])
api_router.include_router(dashboard_router, prefix="/dashboard", tags=["dashboard"]) 