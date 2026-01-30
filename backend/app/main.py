"""ContractClarity FastAPI application."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.core.config import get_settings
from app.core.database import engine, Base
from app.api import documents_router, search_router, health_router, analysis_router, graph_router

# Import models so they're registered with Base
from app.models import document  # noqa: F401
from app.models import knowledge_graph  # noqa: F401

settings = get_settings()


async def init_database():
    """Initialize database with pgvector extension and tables."""
    async with engine.begin() as conn:
        # Enable pgvector extension
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    print(f"Starting {settings.app_name} in {settings.environment} mode")
    await init_database()
    print("Database initialized with pgvector extension")
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
app.include_router(analysis_router)
app.include_router(graph_router)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "ContractClarity API",
        "version": "0.1.0",
        "status": "running",
        "docs": "/docs",
    }
