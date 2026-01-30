"""Hybrid search service combining semantic and keyword search."""

from uuid import UUID
from dataclasses import dataclass
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.embeddings import get_query_embedding


@dataclass
class SearchResult:
    """Search result with combined scoring."""
    chunk_id: UUID
    document_id: UUID
    document_name: str
    content: str
    page_number: int | None
    semantic_score: float
    keyword_score: float
    combined_score: float


async def hybrid_search(
    query: str,
    db: AsyncSession,
    limit: int = 10,
    document_id: UUID | None = None,
    semantic_weight: float = 0.7,
    keyword_weight: float = 0.3,
    min_similarity: float = 0.3,
) -> list[SearchResult]:
    """
    Perform hybrid search combining semantic similarity and keyword matching.

    Uses Reciprocal Rank Fusion (RRF) to combine rankings from both methods.

    Args:
        query: Search query
        db: Database session
        limit: Maximum results to return
        document_id: Optional filter by document
        semantic_weight: Weight for semantic search (0-1)
        keyword_weight: Weight for keyword search (0-1)
        min_similarity: Minimum semantic similarity threshold

    Returns:
        List of SearchResult objects with combined scores
    """
    # Get query embedding for semantic search
    query_embedding = await get_query_embedding(query)

    if query_embedding is None:
        # Fall back to keyword-only search
        return await keyword_search(query, db, limit, document_id)

    embedding_str = f"[{','.join(map(str, query_embedding))}]"

    # Prepare query terms for full-text search
    # Convert to tsquery format: word1 & word2 & word3
    query_terms = " & ".join(query.split())

    # Build hybrid search SQL using RRF (Reciprocal Rank Fusion)
    # RRF score = sum(1 / (k + rank)) where k is a constant (typically 60)
    doc_filter = "AND c.document_id = :document_id" if document_id else ""

    sql = text(f"""
        WITH semantic_results AS (
            SELECT
                c.id as chunk_id,
                c.document_id,
                d.filename as document_name,
                c.content,
                c.page_number,
                1 - (c.embedding <=> '{embedding_str}'::vector) as similarity,
                ROW_NUMBER() OVER (ORDER BY c.embedding <=> '{embedding_str}'::vector) as semantic_rank
            FROM chunks c
            JOIN documents d ON c.document_id = d.id
            WHERE c.embedding IS NOT NULL
            AND 1 - (c.embedding <=> '{embedding_str}'::vector) >= :min_similarity
            {doc_filter}
            ORDER BY c.embedding <=> '{embedding_str}'::vector
            LIMIT :search_limit
        ),
        keyword_results AS (
            SELECT
                c.id as chunk_id,
                ts_rank_cd(to_tsvector('english', c.content), plainto_tsquery('english', :query)) as keyword_score,
                ROW_NUMBER() OVER (
                    ORDER BY ts_rank_cd(to_tsvector('english', c.content), plainto_tsquery('english', :query)) DESC
                ) as keyword_rank
            FROM chunks c
            WHERE to_tsvector('english', c.content) @@ plainto_tsquery('english', :query)
            {doc_filter.replace('c.document_id', 'c.document_id')}
            ORDER BY keyword_score DESC
            LIMIT :search_limit
        )
        SELECT
            sr.chunk_id,
            sr.document_id,
            sr.document_name,
            sr.content,
            sr.page_number,
            sr.similarity as semantic_score,
            COALESCE(kr.keyword_score, 0) as keyword_score,
            -- RRF combination with weights
            (
                :semantic_weight * (1.0 / (60 + sr.semantic_rank)) +
                :keyword_weight * (1.0 / (60 + COALESCE(kr.keyword_rank, 1000)))
            ) as combined_score
        FROM semantic_results sr
        LEFT JOIN keyword_results kr ON sr.chunk_id = kr.chunk_id
        ORDER BY combined_score DESC
        LIMIT :limit
    """)

    params = {
        "query": query,
        "min_similarity": min_similarity,
        "search_limit": limit * 3,  # Get more candidates for RRF
        "limit": limit,
        "semantic_weight": semantic_weight,
        "keyword_weight": keyword_weight,
    }

    if document_id:
        params["document_id"] = document_id

    result = await db.execute(sql, params)
    rows = result.fetchall()

    return [
        SearchResult(
            chunk_id=row.chunk_id,
            document_id=row.document_id,
            document_name=row.document_name,
            content=row.content,
            page_number=row.page_number,
            semantic_score=float(row.semantic_score),
            keyword_score=float(row.keyword_score),
            combined_score=float(row.combined_score),
        )
        for row in rows
    ]


async def keyword_search(
    query: str,
    db: AsyncSession,
    limit: int = 10,
    document_id: UUID | None = None,
) -> list[SearchResult]:
    """
    Perform keyword-only search using PostgreSQL full-text search.

    Fallback when embedding service is unavailable.
    """
    doc_filter = "AND c.document_id = :document_id" if document_id else ""

    sql = text(f"""
        SELECT
            c.id as chunk_id,
            c.document_id,
            d.filename as document_name,
            c.content,
            c.page_number,
            ts_rank_cd(to_tsvector('english', c.content), plainto_tsquery('english', :query)) as keyword_score
        FROM chunks c
        JOIN documents d ON c.document_id = d.id
        WHERE to_tsvector('english', c.content) @@ plainto_tsquery('english', :query)
        {doc_filter}
        ORDER BY keyword_score DESC
        LIMIT :limit
    """)

    params = {"query": query, "limit": limit}
    if document_id:
        params["document_id"] = document_id

    result = await db.execute(sql, params)
    rows = result.fetchall()

    return [
        SearchResult(
            chunk_id=row.chunk_id,
            document_id=row.document_id,
            document_name=row.document_name,
            content=row.content,
            page_number=row.page_number,
            semantic_score=0.0,
            keyword_score=float(row.keyword_score),
            combined_score=float(row.keyword_score),
        )
        for row in rows
    ]


async def similar_chunks(
    chunk_id: UUID,
    db: AsyncSession,
    limit: int = 5,
    exclude_same_document: bool = False,
) -> list[SearchResult]:
    """
    Find chunks similar to a given chunk.

    Useful for finding related clauses across documents.
    """
    # Get the source chunk's embedding
    get_embedding_sql = text("""
        SELECT embedding, document_id FROM chunks WHERE id = :chunk_id
    """)
    result = await db.execute(get_embedding_sql, {"chunk_id": chunk_id})
    row = result.fetchone()

    if not row or row.embedding is None:
        return []

    embedding_str = f"[{','.join(map(str, row.embedding))}]"
    doc_filter = "AND c.document_id != :source_doc_id" if exclude_same_document else ""

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
        AND c.id != :chunk_id
        {doc_filter}
        ORDER BY c.embedding <=> '{embedding_str}'::vector
        LIMIT :limit
    """)

    params = {"chunk_id": chunk_id, "limit": limit}
    if exclude_same_document:
        params["source_doc_id"] = row.document_id

    result = await db.execute(sql, params)
    rows = result.fetchall()

    return [
        SearchResult(
            chunk_id=r.chunk_id,
            document_id=r.document_id,
            document_name=r.document_name,
            content=r.content,
            page_number=r.page_number,
            semantic_score=float(r.similarity),
            keyword_score=0.0,
            combined_score=float(r.similarity),
        )
        for r in rows
    ]
