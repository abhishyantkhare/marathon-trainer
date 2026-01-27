# Redeployed to fix CORS configuration - 2026-01-24
import re
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from database import init_db
from routes.auth import router as auth_router
from routes.profile import router as profile_router
from routes.runs import router as runs_router
from routes.training_plan import router as training_plan_router
from config import get_settings

settings = get_settings()

# CORS configuration
ALLOWED_ORIGINS = [
    settings.frontend_url,
    "http://localhost:3000",
]

# Pattern to match Vercel preview deployment URLs
VERCEL_PREVIEW_PATTERN = re.compile(r"^https://.*\.vercel\.app$")


def is_origin_allowed(origin: str | None) -> bool:
    """Check if the origin is allowed for CORS."""
    if not origin:
        return False
    if origin in ALLOWED_ORIGINS:
        return True
    if VERCEL_PREVIEW_PATTERN.match(origin):
        return True
    return False


class DynamicCORSMiddleware(BaseHTTPMiddleware):
    """Custom CORS middleware that supports dynamic origin validation."""

    async def dispatch(self, request: Request, call_next) -> Response:
        origin = request.headers.get("origin")

        # Handle preflight requests
        if request.method == "OPTIONS":
            if is_origin_allowed(origin):
                return Response(
                    status_code=200,
                    headers={
                        "Access-Control-Allow-Origin": origin,
                        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                        "Access-Control-Allow-Headers": "Content-Type, Authorization",
                        "Access-Control-Allow-Credentials": "true",
                    },
                )
            return Response(status_code=400)

        response = await call_next(request)

        # Add CORS headers to response if origin is allowed
        if is_origin_allowed(origin):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"

        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database tables on startup."""
    await init_db()
    yield


app = FastAPI(
    title="Marathon Training Tracker API",
    description="API for tracking marathon training with Strava integration and AI-powered training plans",
    version="1.0.0",
    lifespan=lifespan,
)

# Custom CORS middleware to support Vercel preview deployments
app.add_middleware(DynamicCORSMiddleware)

# Include routers
app.include_router(auth_router)
app.include_router(profile_router)
app.include_router(runs_router)
app.include_router(training_plan_router)


@app.get("/")
async def root():
    return {
        "message": "Marathon Training Tracker API",
        "docs": "/docs",
        "version": "1.0.0",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
