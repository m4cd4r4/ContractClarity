"""Entity extraction service for knowledge graph construction."""

import json
import re
import httpx
from uuid import UUID
from datetime import datetime
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import get_settings
from app.models.knowledge_graph import Entity, Relationship

settings = get_settings()

# Entity types we extract
ENTITY_TYPES = [
    "party",       # Companies, organizations
    "person",      # Named individuals
    "date",        # Dates (effective, expiration, etc.)
    "amount",      # Monetary values
    "location",    # Addresses, jurisdictions
    "term",        # Duration, renewal periods
    "percentage",  # Percentages, rates
]

# Relationship types
RELATIONSHIP_TYPES = [
    "party_to_contract",
    "effective_date",
    "expiration_date",
    "governs",
    "payment_to",
    "employs",
    "subsidiary_of",
    "controls",
    "guarantor_for",
    "beneficiary_of",
]

EXTRACTION_PROMPT = """You are a legal document analyst specializing in contract entity extraction.
Extract all entities and their relationships from this contract excerpt.

Entity types to extract:
- party: Companies, organizations, LLCs, corporations
- person: Named individuals (executives, signatories)
- date: Important dates (effective date, expiration, renewal, payment due)
- amount: Monetary values (contract value, fees, penalties, caps)
- location: Addresses, jurisdictions, governing law locations
- term: Duration terms (1 year, 36 months, perpetual)
- percentage: Rates, percentages (interest, commission, ownership)

Contract excerpt:
{text}

Respond with JSON containing entities and relationships:
{{
  "entities": [
    {{
      "type": "party|person|date|amount|location|term|percentage",
      "name": "extracted text",
      "value": "normalized value if applicable",
      "context": "surrounding context for clarity"
    }}
  ],
  "relationships": [
    {{
      "source": "entity name",
      "target": "entity name",
      "type": "party_to_contract|effective_date|expiration_date|governs|payment_to|employs|subsidiary_of|controls|guarantor_for|beneficiary_of",
      "description": "brief description"
    }}
  ]
}}

Extract conservatively - only include entities that are clearly stated."""


async def extract_entities_from_text(
    text: str,
    document_id: UUID,
    page_number: int | None = None,
) -> tuple[list[Entity], list[dict]]:
    """
    Extract entities from text using LLM.

    Returns:
        Tuple of (entities list, relationships data for later processing)
    """
    prompt = EXTRACTION_PROMPT.format(text=text[:4000])  # Limit text length

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{settings.ollama_url}/api/generate",
                json={
                    "model": settings.llm_model,
                    "prompt": prompt,
                    "stream": False,
                    "format": "json",
                    "options": {"temperature": 0.1, "num_predict": 2048},
                },
            )

            if response.status_code != 200:
                return [], []

            data = response.json()
            response_text = data.get("response", "")

            # Parse JSON response
            try:
                result = json.loads(response_text)
            except json.JSONDecodeError:
                # Try to extract JSON
                json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                if json_match:
                    result = json.loads(json_match.group())
                else:
                    return [], []

            entities = []
            entities_data = result.get("entities", [])

            for ent_data in entities_data:
                if not ent_data.get("type") or not ent_data.get("name"):
                    continue

                entity_type = ent_data["type"].lower()
                if entity_type not in ENTITY_TYPES:
                    continue

                entity = Entity(
                    document_id=document_id,
                    entity_type=entity_type,
                    name=ent_data["name"][:500],
                    normalized_name=normalize_entity_name(ent_data["name"], entity_type),
                    value=ent_data.get("value"),
                    confidence=0.8,
                    context=ent_data.get("context", "")[:1000],
                    page_number=page_number,
                    entity_metadata={
                        "extraction_model": settings.llm_model,
                        "raw_value": ent_data.get("value"),
                    },
                )
                entities.append(entity)

            relationships_data = result.get("relationships", [])
            return entities, relationships_data

    except Exception as e:
        print(f"Entity extraction error: {e}")
        return [], []


def normalize_entity_name(name: str, entity_type: str) -> str:
    """Normalize entity names for deduplication."""
    normalized = name.strip().upper()

    if entity_type == "party":
        # Remove common suffixes
        for suffix in [", INC.", ", LLC", ", LTD.", ", CORP.", " INC", " LLC", " LTD", " CORP"]:
            normalized = normalized.replace(suffix, "")
        normalized = re.sub(r'\s+', ' ', normalized)

    elif entity_type == "date":
        # Try to parse and normalize dates
        try:
            # Simple date extraction
            date_match = re.search(r'(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})', name)
            if date_match:
                m, d, y = date_match.groups()
                if len(y) == 2:
                    y = "20" + y if int(y) < 50 else "19" + y
                normalized = f"{y}-{m.zfill(2)}-{d.zfill(2)}"
        except Exception:
            pass

    elif entity_type == "amount":
        # Normalize currency amounts
        amount_match = re.search(r'[\$€£]?\s*([\d,]+(?:\.\d{2})?)', name)
        if amount_match:
            normalized = amount_match.group(1).replace(",", "")

    return normalized


async def extract_entities_from_document(
    document_id: UUID,
    db: AsyncSession,
) -> list[Entity]:
    """
    Extract all entities from a document.

    Args:
        document_id: Document UUID
        db: Database session

    Returns:
        List of extracted Entity objects
    """
    from app.services.storage import get_extracted_text
    from app.services.chunking import chunk_for_clause_extraction
    from app.models.document import Chunk

    # Get extracted text
    text = get_extracted_text(document_id)
    if not text:
        # Fall back to chunks
        query = select(Chunk).where(Chunk.document_id == document_id)
        result = await db.execute(query)
        chunks = result.scalars().all()
        text = "\n\n".join(c.content for c in chunks)

    if not text:
        return []

    # Delete existing entities for this document
    await db.execute(delete(Entity).where(Entity.document_id == document_id))
    await db.execute(delete(Relationship).where(Relationship.document_id == document_id))

    # Split into chunks for processing
    text_chunks = await chunk_for_clause_extraction(text)

    all_entities = []
    all_relationships_data = []

    for i, chunk_text in enumerate(text_chunks):
        entities, rel_data = await extract_entities_from_text(
            chunk_text,
            document_id,
            page_number=i + 1,
        )
        all_entities.extend(entities)
        all_relationships_data.extend(rel_data)

    # Deduplicate entities
    unique_entities = deduplicate_entities(all_entities)

    # Save entities first
    entity_map = {}  # normalized_name -> entity
    for entity in unique_entities:
        db.add(entity)
        entity_map[entity.normalized_name] = entity

    await db.flush()  # Get IDs assigned

    # Create relationships
    for rel_data in all_relationships_data:
        source_name = normalize_entity_name(rel_data.get("source", ""), "party")
        target_name = normalize_entity_name(rel_data.get("target", ""), "party")

        source_entity = entity_map.get(source_name)
        target_entity = entity_map.get(target_name)

        if source_entity and target_entity and source_entity.id != target_entity.id:
            rel_type = rel_data.get("type", "related_to")
            if rel_type not in RELATIONSHIP_TYPES:
                rel_type = "related_to"

            relationship = Relationship(
                document_id=document_id,
                source_entity_id=source_entity.id,
                target_entity_id=target_entity.id,
                relationship_type=rel_type,
                description=rel_data.get("description"),
                confidence=0.7,
                relationship_metadata={
                    "extraction_model": settings.llm_model,
                },
            )
            db.add(relationship)

    await db.commit()

    return unique_entities


def deduplicate_entities(entities: list[Entity]) -> list[Entity]:
    """Remove duplicate entities based on normalized name and type."""
    seen = set()
    unique = []

    for entity in entities:
        key = (entity.entity_type, entity.normalized_name)
        if key not in seen:
            seen.add(key)
            unique.append(entity)

    return unique


async def get_document_graph(
    document_id: UUID,
    db: AsyncSession,
) -> dict:
    """
    Get the knowledge graph for a document.

    Returns nodes (entities) and edges (relationships) for visualization.
    """
    # Get entities
    entity_query = select(Entity).where(Entity.document_id == document_id)
    entity_result = await db.execute(entity_query)
    entities = entity_result.scalars().all()

    # Get relationships
    rel_query = select(Relationship).where(Relationship.document_id == document_id)
    rel_result = await db.execute(rel_query)
    relationships = rel_result.scalars().all()

    # Build graph structure
    nodes = [
        {
            "id": str(e.id),
            "label": e.name,
            "type": e.entity_type,
            "value": e.value,
            "normalized": e.normalized_name,
        }
        for e in entities
    ]

    edges = [
        {
            "id": str(r.id),
            "source": str(r.source_entity_id),
            "target": str(r.target_entity_id),
            "type": r.relationship_type,
            "label": r.description or r.relationship_type,
        }
        for r in relationships
    ]

    return {
        "document_id": str(document_id),
        "nodes": nodes,
        "edges": edges,
        "stats": {
            "total_entities": len(entities),
            "total_relationships": len(relationships),
            "entity_types": _count_by_type(entities),
            "relationship_types": _count_by_rel_type(relationships),
        },
    }


def _count_by_type(entities: list[Entity]) -> dict:
    """Count entities by type."""
    counts = {}
    for e in entities:
        counts[e.entity_type] = counts.get(e.entity_type, 0) + 1
    return counts


def _count_by_rel_type(relationships: list[Relationship]) -> dict:
    """Count relationships by type."""
    counts = {}
    for r in relationships:
        counts[r.relationship_type] = counts.get(r.relationship_type, 0) + 1
    return counts


async def find_entity_across_documents(
    entity_name: str,
    entity_type: str | None,
    db: AsyncSession,
) -> list[dict]:
    """
    Find an entity across all documents.

    Useful for identifying which contracts involve a specific party.
    """
    normalized = normalize_entity_name(entity_name, entity_type or "party")

    query = select(Entity).where(Entity.normalized_name == normalized)
    if entity_type:
        query = query.where(Entity.entity_type == entity_type)

    result = await db.execute(query)
    entities = result.scalars().all()

    return [
        {
            "entity_id": str(e.id),
            "document_id": str(e.document_id),
            "name": e.name,
            "type": e.entity_type,
            "value": e.value,
            "context": e.context,
        }
        for e in entities
    ]
