"""Embedding generation service using Ollama."""

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import get_settings
from app.models.document import Chunk

settings = get_settings()


async def generate_embeddings(chunks: list[Chunk], db: AsyncSession) -> None:
    """
    Generate embeddings for document chunks and save to database.

    Uses Ollama with nomic-embed-text model (768 dimensions).

    Args:
        chunks: List of Chunk objects to embed
        db: Database session
    """
    async with httpx.AsyncClient(timeout=60.0) as client:
        for chunk in chunks:
            try:
                # Generate embedding via Ollama
                response = await client.post(
                    f"{settings.ollama_url}/api/embeddings",
                    json={
                        "model": settings.embedding_model,
                        "prompt": chunk.content,
                    },
                )

                if response.status_code == 200:
                    data = response.json()
                    embedding = data.get("embedding")

                    if embedding:
                        chunk.embedding = embedding

            except Exception as e:
                # Log error but continue with other chunks
                chunk.chunk_metadata["embedding_error"] = str(e)

            # Add chunk to session
            db.add(chunk)

        # Commit all chunks
        await db.commit()


async def get_query_embedding(query: str) -> list[float] | None:
    """
    Generate embedding for a search query.

    Args:
        query: Search query text

    Returns:
        List of floats representing the embedding, or None if failed
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{settings.ollama_url}/api/embeddings",
                json={
                    "model": settings.embedding_model,
                    "prompt": query,
                },
            )

            if response.status_code == 200:
                data = response.json()
                return data.get("embedding")

    except Exception:
        pass

    return None


async def batch_generate_embeddings(
    texts: list[str], batch_size: int = 10
) -> list[list[float] | None]:
    """
    Generate embeddings for multiple texts in batches.

    Args:
        texts: List of text strings to embed
        batch_size: Number of texts to process at once

    Returns:
        List of embeddings (or None for failed texts)
    """
    embeddings = []

    async with httpx.AsyncClient(timeout=60.0) as client:
        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]

            for text in batch:
                try:
                    response = await client.post(
                        f"{settings.ollama_url}/api/embeddings",
                        json={
                            "model": settings.embedding_model,
                            "prompt": text,
                        },
                    )

                    if response.status_code == 200:
                        data = response.json()
                        embeddings.append(data.get("embedding"))
                    else:
                        embeddings.append(None)

                except Exception:
                    embeddings.append(None)

    return embeddings
