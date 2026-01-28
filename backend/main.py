# Redeployed to fix CORS configuration - 2026-01-24
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db
from routes.auth import router as auth_router
from routes.profile import router as profile_router
from routes.runs import router as runs_router
from routes.training_plan import router as training_plan_router
from config import get_settings

settings = get_settings()


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

# CORS middleware
# Note: allow_origin_regex is used to support Vercel preview deployments
# The pattern matches preview URLs like: https://marathon-trainer-frontend-abc123.vercel.app
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_origin_regex=r"^https://marathon-trainer-frontend-[^.]+\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
