"""ContractClarity FastAPI application."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.api import documents_router, search_router, health_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    print(f"Starting {settings.app_name} in {settings.environment} mode")
    yield
    # Shutdown
    print(f"Shutting down {settings.app_name}")


app = FastAPI(
    title="ContractClarity API",
    description="AI-powered contract analysis for M&A due diligence",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health_router)
app.include_router(documents_router)
app.include_router(search_router)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "ContractClarity API",
        "version": "0.1.0",
        "status": "running",
        "docs": "/docs",
    }
