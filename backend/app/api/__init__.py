# API routes
from app.api.documents import router as documents_router
from app.api.search import router as search_router
from app.api.health import router as health_router
from app.api.analysis import router as analysis_router
from app.api.graph import router as graph_router

__all__ = ["documents_router", "search_router", "health_router", "analysis_router", "graph_router"]
