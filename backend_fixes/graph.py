"""Knowledge graph API endpoints."""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from app.core.database import get_db
from app.models.document import Document
from app.models.knowledge_graph import Entity, Relationship
from app.services.entity_extraction import (
    get_document_graph,
    find_entity_across_documents,
    ENTITY_TYPES,
    RELATIONSHIP_TYPES,
)
from app.tasks.analysis_tasks import extract_entities_task

router = APIRouter(prefix="/graph", tags=["knowledge-graph"])


class EntityResponse(BaseModel):
    """Response model for an entity."""

    id: UUID
    document_id: UUID
    entity_type: str
    name: str
    normalized_name: str | None
    value: str | None
    confidence: float | None
    context: str | None

    class Config:
        from_attributes = True


class GraphResponse(BaseModel):
    """Response model for document graph."""

    document_id: str
    nodes: list[dict]
    edges: list[dict]
    stats: dict


class ExtractionStatusResponse(BaseModel):
    """Response for extraction status."""

    document_id: UUID
    status: str
    entities_found: int
    relationships_found: int
    message: str
    task_id: str | None = None


# ============================================
# STATIC ROUTES (must come before dynamic routes)
# ============================================

@router.get("/types")
async def list_types():
    """
    List all supported entity and relationship types.
    """
    return {
        "entity_types": ENTITY_TYPES,
        "relationship_types": RELATIONSHIP_TYPES,
        "entity_descriptions": {
            "party": "Companies, organizations, LLCs, corporations",
            "person": "Named individuals (executives, signatories)",
            "date": "Important dates (effective, expiration, renewal)",
            "amount": "Monetary values (fees, caps, penalties)",
            "location": "Addresses, jurisdictions, governing law",
            "term": "Duration terms (contract length, renewal)",
            "percentage": "Rates, percentages (interest, commission)",
        },
        "relationship_descriptions": {
            "party_to_contract": "Party is a signatory to the contract",
            "effective_date": "Contract becomes effective on this date",
            "expiration_date": "Contract expires on this date",
            "governs": "Jurisdiction governs the contract",
            "payment_to": "Payment obligation between parties",
            "employs": "Employment relationship",
            "subsidiary_of": "Corporate subsidiary relationship",
            "controls": "Control or ownership relationship",
            "guarantor_for": "Guarantor relationship",
            "beneficiary_of": "Beneficiary relationship",
        },
    }


@router.get("/stats")
async def graph_stats(
    db: AsyncSession = Depends(get_db),
):
    """
    Get overall knowledge graph statistics.
    """
    # Count entities by type
    entity_stats = await db.execute(
        select(Entity.entity_type, func.count(Entity.id))
        .group_by(Entity.entity_type)
    )
    entity_rows = entity_stats.fetchall()

    # Count relationships by type
    rel_stats = await db.execute(
        select(Relationship.relationship_type, func.count(Relationship.id))
        .group_by(Relationship.relationship_type)
    )
    rel_rows = rel_stats.fetchall()

    # Count documents with entities
    doc_count = await db.execute(
        select(func.count(func.distinct(Entity.document_id)))
    )

    return {
        "documents_with_entities": doc_count.scalar() or 0,
        "entity_counts": {row[0]: row[1] for row in entity_rows},
        "relationship_counts": {row[0]: row[1] for row in rel_rows},
        "total_entities": sum(row[1] for row in entity_rows),
        "total_relationships": sum(row[1] for row in rel_rows),
    }


@router.get("/search/entity")
async def search_entity(
    name: str = Query(..., min_length=2, description="Entity name to search"),
    entity_type: str | None = Query(None, description="Filter by entity type"),
    db: AsyncSession = Depends(get_db),
):
    """
    Search for an entity across all documents.

    Useful for finding which contracts involve a specific party,
    or tracking an entity across the portfolio.
    """
    results = await find_entity_across_documents(name, entity_type, db)

    return {
        "query": name,
        "entity_type": entity_type,
        "results": results,
        "total": len(results),
        "documents_found": len(set(r["document_id"] for r in results)),
    }


# ============================================
# DYNAMIC ROUTES (document-specific)
# ============================================

@router.post("/{document_id}/extract", response_model=ExtractionStatusResponse)
async def trigger_entity_extraction(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Trigger entity extraction for a document.

    Extracts parties, dates, amounts, locations, and other entities.
    Also identifies relationships between entities.
    """
    # Verify document exists and is processed
    query = select(Document).where(Document.id == document_id)
    result = await db.execute(query)
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.status != "completed":
        raise HTTPException(
            status_code=400,
            detail=f"Document must be processed first. Current status: {doc.status}",
        )

    # Check if already extracted
    entity_query = select(func.count(Entity.id)).where(Entity.document_id == document_id)
    entity_result = await db.execute(entity_query)
    entity_count = entity_result.scalar()

    rel_query = select(func.count(Relationship.id)).where(Relationship.document_id == document_id)
    rel_result = await db.execute(rel_query)
    rel_count = rel_result.scalar()

    if entity_count > 0:
        return ExtractionStatusResponse(
            document_id=document_id,
            status="completed",
            entities_found=entity_count,
            relationships_found=rel_count,
            message="Entities already extracted. Use /graph/{id}/reextract to refresh.",
        )

    # Queue Celery task for extraction
    task = extract_entities_task.delay(str(document_id), reextract=False)

    return ExtractionStatusResponse(
        document_id=document_id,
        status="queued",
        entities_found=0,
        relationships_found=0,
        message="Entity extraction queued. Check /graph/{id} for results.",
        task_id=task.id,
    )


@router.post("/{document_id}/reextract", response_model=ExtractionStatusResponse)
async def reextract_entities(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Re-extract entities from a document.

    Deletes existing entities and relationships, then extracts fresh.
    """
    # Verify document exists
    query = select(Document).where(Document.id == document_id)
    result = await db.execute(query)
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Queue Celery task for re-extraction
    task = extract_entities_task.delay(str(document_id), reextract=True)

    return ExtractionStatusResponse(
        document_id=document_id,
        status="queued",
        entities_found=0,
        relationships_found=0,
        message="Re-extraction queued. Previous entities will be replaced.",
        task_id=task.id,
    )


@router.get("/{document_id}", response_model=GraphResponse)
async def get_graph(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Get the knowledge graph for a document.

    Returns nodes (entities) and edges (relationships) suitable for visualization.
    """
    # Verify document exists
    query = select(Document).where(Document.id == document_id)
    result = await db.execute(query)
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    graph = await get_document_graph(document_id, db)
    return GraphResponse(**graph)


@router.get("/{document_id}/entities", response_model=list[EntityResponse])
async def get_document_entities(
    document_id: UUID,
    entity_type: str | None = Query(None, description="Filter by entity type"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all entities extracted from a document.

    Optionally filter by entity type.
    """
    query = select(Entity).where(Entity.document_id == document_id)

    if entity_type:
        query = query.where(Entity.entity_type == entity_type)

    query = query.order_by(Entity.entity_type, Entity.name)
    result = await db.execute(query)
    entities = result.scalars().all()

    return [
        EntityResponse(
            id=e.id,
            document_id=e.document_id,
            entity_type=e.entity_type,
            name=e.name,
            normalized_name=e.normalized_name,
            value=e.value,
            confidence=e.confidence,
            context=e.context,
        )
        for e in entities
    ]


@router.get("/{document_id}/relationships")
async def get_document_relationships(
    document_id: UUID,
    relationship_type: str | None = Query(None, description="Filter by relationship type"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all relationships in a document's knowledge graph.
    """
    query = select(Relationship).where(Relationship.document_id == document_id)

    if relationship_type:
        query = query.where(Relationship.relationship_type == relationship_type)

    result = await db.execute(query)
    relationships = result.scalars().all()

    # Get entity names for display
    entity_ids = set()
    for r in relationships:
        entity_ids.add(r.source_entity_id)
        entity_ids.add(r.target_entity_id)

    if entity_ids:
        entity_query = select(Entity).where(Entity.id.in_(entity_ids))
        entity_result = await db.execute(entity_query)
        entities = {e.id: e for e in entity_result.scalars().all()}
    else:
        entities = {}

    return {
        "relationships": [
            {
                "id": str(r.id),
                "source_entity": {
                    "id": str(r.source_entity_id),
                    "name": entities[r.source_entity_id].name if r.source_entity_id in entities else None,
                    "type": entities[r.source_entity_id].entity_type if r.source_entity_id in entities else None,
                },
                "target_entity": {
                    "id": str(r.target_entity_id),
                    "name": entities[r.target_entity_id].name if r.target_entity_id in entities else None,
                    "type": entities[r.target_entity_id].entity_type if r.target_entity_id in entities else None,
                },
                "type": r.relationship_type,
                "description": r.description,
                "confidence": r.confidence,
            }
            for r in relationships
        ],
        "total": len(relationships),
    }
