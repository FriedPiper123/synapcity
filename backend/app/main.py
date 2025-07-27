from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
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

# Include API routes FIRST
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Mount static files with proper MIME types
if os.path.exists("static"):
    # Mount the entire static directory
    app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")
    app.mount("/static", StaticFiles(directory="static"), name="static")

# Root route - serve React app
@app.get("/")
async def serve_root():
    if os.path.exists("static/index.html"):
        return FileResponse("static/index.html")
    else:
        return {"message": "Frontend not built or static files not found"}

# Serve specific static files at root level (for Vite)
@app.get("/icon.png")
async def serve_icon():
    if os.path.exists("static/icon.png"):
        return FileResponse("static/icon.png")
    raise HTTPException(status_code=404)

@app.get("/favicon.ico")
async def serve_favicon():
    if os.path.exists("static/favicon.ico"):
        return FileResponse("static/favicon.ico")
    raise HTTPException(status_code=404)

# Catch-all route for React Router (SPA routing) - MUST BE LAST
@app.get("/{path:path}")
async def serve_react_app(path: str):
    # Let FastAPI handle static file mounting naturally
    # Only serve React app for routes that don't exist as files
    if os.path.exists("static/index.html"):
        return FileResponse("static/index.html")
    else:
        raise HTTPException(status_code=404, detail="Frontend not found")