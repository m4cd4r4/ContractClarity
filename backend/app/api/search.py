"""Semantic and hybrid search endpoints."""

from uuid import UUID
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from app.core.database import get_db
from app.core.config import get_settings
from app.models.document import Chunk, Document
from app.services.embeddings import get_query_embedding
from app.services.hybrid_search import hybrid_search, similar_chunks, keyword_search

router = APIRouter(prefix="/search", tags=["search"])
settings = get_settings()


class SearchResult(BaseModel):
    """Single search result."""

    chunk_id: UUID
    document_id: UUID
    document_name: str
    content: str
    page_number: int | None
    semantic_score: float = 0.0
    keyword_score: float = 0.0
    combined_score: float = 0.0

    class Config:
        from_attributes = True


class SearchResponse(BaseModel):
    """Search response with results."""

    query: str
    results: list[SearchResult]
    total: int
    search_type: str = "hybrid"


class SearchRequest(BaseModel):
    """Search request parameters."""

    query: str = Field(..., min_length=3, description="Search query")
    limit: int = Field(10, ge=1, le=50, description="Number of results")
    document_id: UUID | None = Field(None, description="Filter by document")
    semantic_weight: float = Field(0.7, ge=0, le=1, description="Weight for semantic search")
    keyword_weight: float = Field(0.3, ge=0, le=1, description="Weight for keyword search")
    min_similarity: float = Field(0.3, ge=0, le=1, description="Minimum similarity threshold")


@router.get("", response_model=SearchResponse)
async def search(
    q: str = Query(..., min_length=3, description="Search query"),
    limit: int = Query(10, ge=1, le=50, description="Number of results"),
    document_id: UUID | None = Query(None, description="Filter by document"),
    mode: str = Query("hybrid", description="Search mode: hybrid, semantic, or keyword"),
    semantic_weight: float = Query(0.7, ge=0, le=1, description="Semantic weight (hybrid mode)"),
    keyword_weight: float = Query(0.3, ge=0, le=1, description="Keyword weight (hybrid mode)"),
    db: AsyncSession = Depends(get_db),
):
    """
    Search across all document chunks.

    Supports three modes:
    - **hybrid** (default): Combines semantic and keyword search using RRF
    - **semantic**: Pure vector similarity search
    - **keyword**: Pure PostgreSQL full-text search
    """
    if mode == "hybrid":
        results = await hybrid_search(
            query=q,
            db=db,
            limit=limit,
            document_id=document_id,
            semantic_weight=semantic_weight,
            keyword_weight=keyword_weight,
        )
    elif mode == "semantic":
        results = await _semantic_search(q, db, limit, document_id)
    elif mode == "keyword":
        results = await keyword_search(q, db, limit, document_id)
    else:
        raise HTTPException(status_code=400, detail="Invalid search mode")

    return SearchResponse(
        query=q,
        results=[
            SearchResult(
                chunk_id=r.chunk_id,
                document_id=r.document_id,
                document_name=r.document_name,
                content=r.content,
                page_number=r.page_number,
                semantic_score=r.semantic_score,
                keyword_score=r.keyword_score,
                combined_score=r.combined_score,
            )
            for r in results
        ],
        total=len(results),
        search_type=mode,
    )


@router.post("", response_model=SearchResponse)
async def search_post(
    request: SearchRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Search with full control via POST request.

    Allows specifying all search parameters in the request body.
    """
    results = await hybrid_search(
        query=request.query,
        db=db,
        limit=request.limit,
        document_id=request.document_id,
        semantic_weight=request.semantic_weight,
        keyword_weight=request.keyword_weight,
        min_similarity=request.min_similarity,
    )

    return SearchResponse(
        query=request.query,
        results=[
            SearchResult(
                chunk_id=r.chunk_id,
                document_id=r.document_id,
                document_name=r.document_name,
                content=r.content,
                page_number=r.page_number,
                semantic_score=r.semantic_score,
                keyword_score=r.keyword_score,
                combined_score=r.combined_score,
            )
            for r in results
        ],
        total=len(results),
        search_type="hybrid",
    )


@router.get("/similar/{chunk_id}")
async def find_similar(
    chunk_id: UUID,
    limit: int = Query(5, ge=1, le=20),
    cross_document: bool = Query(True, description="Search across different documents"),
    db: AsyncSession = Depends(get_db),
):
    """
    Find chunks similar to a given chunk.

    Useful for:
    - Finding related clauses across contracts
    - Identifying common language patterns
    - Cross-document clause comparison
    """
    results = await similar_chunks(
        chunk_id=chunk_id,
        db=db,
        limit=limit,
        exclude_same_document=cross_document,
    )

    return {
        "source_chunk_id": str(chunk_id),
        "similar_chunks": [
            {
                "chunk_id": str(r.chunk_id),
                "document_id": str(r.document_id),
                "document_name": r.document_name,
                "content": r.content,
                "page_number": r.page_number,
                "similarity": r.semantic_score,
            }
            for r in results
        ],
        "total": len(results),
    }


@router.get("/clauses")
async def search_clauses(
    clause_type: str = Query(None, description="Filter by clause type"),
    risk_level: str = Query(None, description="Filter by risk level"),
    document_id: UUID | None = Query(None, description="Filter by document"),
    q: str | None = Query(None, min_length=3, description="Search within clause content"),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """
    Search extracted clauses.

    Clause types include:
    - change_of_control
    - termination
    - ip_assignment
    - indemnification
    - limitation_of_liability
    - confidentiality
    - non_compete
    - payment_terms
    - warranty
    - governing_law

    Risk levels: low, medium, high, critical
    """
    from app.models.document import Clause

    query = select(Clause).join(Document)

    if clause_type:
        query = query.where(Clause.clause_type == clause_type)
    if risk_level:
        query = query.where(Clause.risk_level == risk_level)
    if document_id:
        query = query.where(Clause.document_id == document_id)

    query = query.limit(limit).order_by(Clause.created_at.desc())
    result = await db.execute(query)
    clauses = result.scalars().all()

    # If search query provided, filter by content
    if q:
        q_lower = q.lower()
        clauses = [c for c in clauses if q_lower in c.content.lower()]

    return {
        "clauses": [
            {
                "id": str(c.id),
                "document_id": str(c.document_id),
                "clause_type": c.clause_type,
                "content": c.content,
                "summary": c.summary,
                "risk_level": c.risk_level,
                "confidence": c.confidence,
                "metadata": c.clause_metadata,
            }
            for c in clauses
        ],
        "total": len(clauses),
    }


@router.get("/stats")
async def search_stats(
    db: AsyncSession = Depends(get_db),
):
    """
    Get search index statistics.

    Returns information about indexed documents and chunks.
    """
    # Count documents and chunks
    doc_count = await db.execute(text("SELECT COUNT(*) FROM documents WHERE status = 'completed'"))
    chunk_count = await db.execute(text("SELECT COUNT(*) FROM chunks WHERE embedding IS NOT NULL"))
    clause_count = await db.execute(text("SELECT COUNT(*) FROM clauses"))

    # Get clause type distribution
    clause_types = await db.execute(text("""
        SELECT clause_type, COUNT(*) as count
        FROM clauses
        GROUP BY clause_type
        ORDER BY count DESC
    """))

    # Get risk level distribution
    risk_levels = await db.execute(text("""
        SELECT risk_level, COUNT(*) as count
        FROM clauses
        WHERE risk_level IS NOT NULL
        GROUP BY risk_level
        ORDER BY count DESC
    """))

    return {
        "documents_indexed": doc_count.scalar(),
        "chunks_with_embeddings": chunk_count.scalar(),
        "clauses_extracted": clause_count.scalar(),
        "clause_types": [
            {"type": row.clause_type, "count": row.count}
            for row in clause_types.fetchall()
        ],
        "risk_distribution": [
            {"level": row.risk_level, "count": row.count}
            for row in risk_levels.fetchall()
        ],
    }


async def _semantic_search(
    query: str,
    db: AsyncSession,
    limit: int,
    document_id: UUID | None,
) -> list:
    """Internal semantic-only search."""
    from app.services.hybrid_search import SearchResult as HybridResult

    query_embedding = await get_query_embedding(query)

    if query_embedding is None:
        return []

    embedding_str = f"[{','.join(map(str, query_embedding))}]"
    doc_filter = "AND c.document_id = :document_id" if document_id else ""

    sql = text(f"""
        SELECT
            c.id as chunk_id,
            c.document_id,
            d.filename as document_name,
            c.content,
            c.page_number,
            1 - (c.embedding <=> '{embedding_str}'::vector) as similarity
        FROM chunks c
        JOIN documents d ON c.document_id = d.id
        WHERE c.embedding IS NOT NULL
        {doc_filter}
        ORDER BY c.embedding <=> '{embedding_str}'::vector
        LIMIT :limit
    """)

    params = {"limit": limit}
    if document_id:
        params["document_id"] = document_id

    result = await db.execute(sql, params)
    rows = result.fetchall()

    return [
        HybridResult(
            chunk_id=row.chunk_id,
            document_id=row.document_id,
            document_name=row.document_name,
            content=row.content,
            page_number=row.page_number,
            semantic_score=float(row.similarity),
            keyword_score=0.0,
            combined_score=float(row.similarity),
        )
        for row in rows
    ]
