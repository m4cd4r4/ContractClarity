"""Semantic search endpoints."""

from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from app.core.database import get_db
from app.core.config import get_settings
from app.models.document import Chunk, Document
from app.services.embeddings import get_query_embedding

router = APIRouter(prefix="/search", tags=["search"])
settings = get_settings()


class SearchResult(BaseModel):
    """Single search result."""

    chunk_id: UUID
    document_id: UUID
    document_name: str
    content: str
    page_number: int | None
    similarity: float

    class Config:
        from_attributes = True


class SearchResponse(BaseModel):
    """Search response with results."""

    query: str
    results: list[SearchResult]
    total: int


@router.get("", response_model=SearchResponse)
async def semantic_search(
    q: str = Query(..., min_length=3, description="Search query"),
    limit: int = Query(10, ge=1, le=50, description="Number of results"),
    document_id: UUID | None = Query(None, description="Filter by document"),
    db: AsyncSession = Depends(get_db),
):
    """
    Perform semantic search across all document chunks.

    Uses pgvector cosine similarity to find relevant passages.
    """
    # Get query embedding
    query_embedding = await get_query_embedding(q)

    if query_embedding is None:
        return SearchResponse(query=q, results=[], total=0)

    # Build search query with pgvector
    # Using cosine distance: 1 - cosine_similarity
    embedding_str = f"[{','.join(map(str, query_embedding))}]"

    if document_id:
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
            AND c.document_id = :document_id
            ORDER BY c.embedding <=> '{embedding_str}'::vector
            LIMIT :limit
        """)
        result = await db.execute(sql, {"document_id": document_id, "limit": limit})
    else:
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
            ORDER BY c.embedding <=> '{embedding_str}'::vector
            LIMIT :limit
        """)
        result = await db.execute(sql, {"limit": limit})

    rows = result.fetchall()

    results = [
        SearchResult(
            chunk_id=row.chunk_id,
            document_id=row.document_id,
            document_name=row.document_name,
            content=row.content,
            page_number=row.page_number,
            similarity=float(row.similarity),
        )
        for row in rows
    ]

    return SearchResponse(query=q, results=results, total=len(results))


@router.get("/clauses")
async def search_clauses(
    clause_type: str = Query(None, description="Filter by clause type"),
    risk_level: str = Query(None, description="Filter by risk level"),
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
    """
    from app.models.document import Clause

    query = select(Clause)

    if clause_type:
        query = query.where(Clause.clause_type == clause_type)
    if risk_level:
        query = query.where(Clause.risk_level == risk_level)

    query = query.limit(limit).order_by(Clause.created_at.desc())
    result = await db.execute(query)
    clauses = result.scalars().all()

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
            }
            for c in clauses
        ],
        "total": len(clauses),
    }
