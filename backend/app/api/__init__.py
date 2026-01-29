# API routes
from app.api.documents import router as documents_router
from app.api.search import router as search_router
from app.api.health import router as health_router

__all__ = ["documents_router", "search_router", "health_router"]
