"""Celery tasks for clause and entity extraction."""

import asyncio
from uuid import UUID
from celery import shared_task
from sqlalchemy import select, delete
from app.worker import celery_app
from app.core.database import AsyncSessionLocal
from app.models.document import Document, Clause, Chunk
from app.services.clause_extraction import extract_clauses_from_document
from app.services.entity_extraction import extract_entities_from_document


def run_async(coro):
    """Helper to run async code in sync Celery tasks."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            raise RuntimeError("Loop is closed")
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    return loop.run_until_complete(coro)


@celery_app.task(bind=True, max_retries=2, default_retry_delay=30)
def extract_clauses_task(self, document_id: str, reanalyze: bool = False):
    """
    Extract legal clauses from a document using LLM.

    Args:
        document_id: UUID of the document
        reanalyze: If True, delete existing clauses first
    """
    try:
        result = run_async(_extract_clauses_async(document_id, reanalyze))
        return result
    except Exception as exc:
        print(f"Clause extraction error for {document_id}: {exc}")
        raise self.retry(exc=exc)


async def _extract_clauses_async(document_id: str, reanalyze: bool):
    """Async implementation of clause extraction."""
    async with AsyncSessionLocal() as db:
        # Verify document exists
        query = select(Document).where(Document.id == UUID(document_id))
        result = await db.execute(query)
        doc = result.scalar_one_or_none()

        if not doc:
            raise ValueError(f"Document not found: {document_id}")

        if doc.status != "completed":
            raise ValueError(f"Document not ready: {doc.status}")

        # Delete existing clauses if reanalyzing
        if reanalyze:
            delete_query = delete(Clause).where(Clause.document_id == UUID(document_id))
            await db.execute(delete_query)
            await db.commit()

        # Run clause extraction
        clauses = await extract_clauses_from_document(UUID(document_id), db)

        return {
            "document_id": document_id,
            "clauses_extracted": len(clauses) if clauses else 0,
            "status": "completed"
        }


@celery_app.task(bind=True, max_retries=2, default_retry_delay=30)
def extract_entities_task(self, document_id: str, reextract: bool = False):
    """
    Extract entities and relationships from a document for knowledge graph.

    Args:
        document_id: UUID of the document
        reextract: If True, delete existing entities first
    """
    try:
        result = run_async(_extract_entities_async(document_id, reextract))
        return result
    except Exception as exc:
        print(f"Entity extraction error for {document_id}: {exc}")
        raise self.retry(exc=exc)


async def _extract_entities_async(document_id: str, reextract: bool):
    """Async implementation of entity extraction."""
    from app.models.knowledge_graph import Entity, Relationship

    async with AsyncSessionLocal() as db:
        # Verify document exists
        query = select(Document).where(Document.id == UUID(document_id))
        result = await db.execute(query)
        doc = result.scalar_one_or_none()

        if not doc:
            raise ValueError(f"Document not found: {document_id}")

        if doc.status != "completed":
            raise ValueError(f"Document not ready: {doc.status}")

        # Delete existing entities and relationships if reextracting
        if reextract:
            # Delete relationships first (they reference entities)
            rel_delete = delete(Relationship).where(Relationship.document_id == UUID(document_id))
            await db.execute(rel_delete)
            # Delete entities
            entity_delete = delete(Entity).where(Entity.document_id == UUID(document_id))
            await db.execute(entity_delete)
            await db.commit()

        # Run entity extraction
        entities = await extract_entities_from_document(UUID(document_id), db)

        return {
            "document_id": document_id,
            "entities_extracted": len(entities) if entities else 0,
            "status": "completed"
        }
