"""Celery tasks for document processing."""

import asyncio
from uuid import UUID
from datetime import datetime, timezone
from celery import shared_task
from sqlalchemy import select
from app.worker import celery_app
from app.core.database import AsyncSessionLocal
from app.models.document import Document, Chunk
from app.services.storage import download_document, store_extracted_text
from app.services.ocr_pipeline import extract_text_with_ocr
from app.services.chunking import chunk_document
from app.services.embeddings import generate_embeddings


def run_async(coro):
    """Helper to run async code in sync Celery tasks."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def process_document(self, document_id: str):
    """
    Process an uploaded document.

    Pipeline:
    1. Download from MinIO
    2. Extract text (4-tier OCR if needed)
    3. Store extracted text
    4. Chunk the text
    5. Generate embeddings
    6. Update document status

    Args:
        document_id: UUID of the document to process
    """
    try:
        run_async(_process_document_async(document_id))
    except Exception as exc:
        # Retry on failure
        raise self.retry(exc=exc)


async def _process_document_async(document_id: str):
    """Async implementation of document processing."""
    async with AsyncSessionLocal() as db:
        # Get document
        query = select(Document).where(Document.id == UUID(document_id))
        result = await db.execute(query)
        doc = result.scalar_one_or_none()

        if not doc:
            raise ValueError(f"Document not found: {document_id}")

        try:
            # Update status to processing
            doc.status = "processing"
            await db.commit()

            # Step 1: Download from MinIO
            pdf_content = download_document(UUID(document_id))

            # Step 2: Extract text with OCR pipeline
            extraction_result = await extract_text_with_ocr(pdf_content)
            text = extraction_result["text"]
            page_count = extraction_result["page_count"]
            ocr_tier_used = extraction_result["tier_used"]

            # Update document metadata
            doc.page_count = page_count
            doc.metadata = {
                **doc.metadata,
                "ocr_tier": ocr_tier_used,
                "extraction_confidence": extraction_result.get("confidence", 1.0),
                "char_count": len(text),
                "word_count": len(text.split()),
            }

            # Step 3: Store extracted text in MinIO
            store_extracted_text(UUID(document_id), text)

            # Step 4: Chunk the text
            chunks = await chunk_document(text, UUID(document_id))

            # Step 5: Generate embeddings and save chunks
            await generate_embeddings(chunks, db)

            # Step 6: Update status to completed
            doc.status = "completed"
            doc.processed_at = datetime.now(timezone.utc)
            await db.commit()

            return {
                "document_id": document_id,
                "status": "completed",
                "page_count": page_count,
                "chunk_count": len(chunks),
                "ocr_tier": ocr_tier_used,
            }

        except Exception as e:
            # Update status to failed
            doc.status = "failed"
            doc.metadata = {**doc.metadata, "error": str(e)}
            await db.commit()
            raise


@celery_app.task(bind=True, max_retries=3)
def generate_document_embeddings(self, document_id: str):
    """
    Regenerate embeddings for a document.

    Useful if embedding model changes or embeddings were corrupted.
    """
    try:
        run_async(_regenerate_embeddings_async(document_id))
    except Exception as exc:
        raise self.retry(exc=exc)


async def _regenerate_embeddings_async(document_id: str):
    """Regenerate embeddings for existing chunks."""
    async with AsyncSessionLocal() as db:
        # Get all chunks for this document
        query = select(Chunk).where(Chunk.document_id == UUID(document_id))
        result = await db.execute(query)
        chunks = result.scalars().all()

        if not chunks:
            raise ValueError(f"No chunks found for document: {document_id}")

        # Clear existing embeddings and regenerate
        for chunk in chunks:
            chunk.embedding = None

        await generate_embeddings(chunks, db)

        return {"document_id": document_id, "chunks_updated": len(chunks)}
