import time
import structlog
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

logger = structlog.get_logger()

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Get request details
        request_id = request.headers.get('X-Request-ID', 'no-request-id')
        method = request.method
        url = str(request.url)
        client_host = request.client.host if request.client else "unknown"
        
        # Log request start
        logger.info(
            "Request started",
            request_id=request_id,
            method=method,
            url=url,
            client_host=client_host,
            path=request.url.path,
            query_params=dict(request.query_params)
        )
        
        # Process request and time it
        start_time = time.time()
        try:
            response = await call_next(request)
            process_time = time.time() - start_time
            
            # Log successful response
            logger.info(
                "Request completed",
                request_id=request_id,
                method=method,
                url=url,
                status_code=response.status_code,
                process_time=f"{process_time:.4f}s"
            )
            
            # Add X-Process-Time header
            response.headers["X-Process-Time"] = f"{process_time:.4f}s"
            response.headers["X-Request-ID"] = request_id
            
            return response
            
        except Exception as e:
            # Log error
            process_time = time.time() - start_time
            logger.error(
                "Request failed",
                request_id=request_id,
                method=method,
                url=url,
                error=str(e),
                process_time=f"{process_time:.4f}s"
            )
            raise
