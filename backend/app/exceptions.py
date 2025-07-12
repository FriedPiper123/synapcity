from fastapi import HTTPException, Request
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

class ErrorResponse(BaseModel):
    detail: str
    status_code: int

class SynapCityException(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)

class UserNotFound(SynapCityException):
    def __init__(self, user_id: str):
        super().__init__(f"User {user_id} not found", 404)

class PostNotFound(SynapCityException):
    def __init__(self, post_id: str):
        super().__init__(f"Post {post_id} not found", 404)

class UnauthorizedError(SynapCityException):
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(message, 401)

async def synapcity_exception_handler(request: Request, exc: SynapCityException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message, "status_code": exc.status_code}
    )

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": str(exc), "status_code": 422}
    )

async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "status_code": exc.status_code}
    )
