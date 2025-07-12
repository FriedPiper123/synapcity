from .users import router as users_router
from .posts import router as posts_router
from .areas import router as areas_router

# List of all API routers
routers = [
    users_router,
    posts_router,
    areas_router,
]
