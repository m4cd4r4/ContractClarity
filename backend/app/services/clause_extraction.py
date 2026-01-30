"""Clause extraction service using LLM."""

import json
import httpx
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import get_settings
from app.models.document import Clause, Chunk

settings = get_settings()

# Contract clause types we extract
CLAUSE_TYPES = [
    "change_of_control",
    "termination",
    "ip_assignment",
    "indemnification",
    "limitation_of_liability",
    "confidentiality",
    "non_compete",
    "non_solicitation",
    "payment_terms",
    "warranty",
    "governing_law",
    "dispute_resolution",
    "force_majeure",
    "assignment",
    "audit_rights",
    "data_protection",
]

# Risk factors for M&A due diligence
RISK_FACTORS = {
    "change_of_control": {
        "high": ["consent required", "may terminate", "acceleration", "buyout"],
        "critical": ["automatic termination", "immediate vesting", "put option"],
    },
    "termination": {
        "high": ["convenience", "30 days", "without cause"],
        "critical": ["immediate termination", "material breach undefined"],
    },
    "ip_assignment": {
        "high": ["work for hire", "all rights", "worldwide"],
        "critical": ["pre-existing ip", "joint ownership", "reversion"],
    },
    "indemnification": {
        "high": ["unlimited", "gross negligence", "willful misconduct"],
        "critical": ["uncapped", "consequential damages", "third party claims"],
    },
    "limitation_of_liability": {
        "high": ["cap less than contract value", "12 months fees"],
        "critical": ["no limitation", "excludes indemnification"],
    },
}

EXTRACTION_PROMPT = """You are a legal contract analyst specializing in M&A due diligence.
Analyze the following contract excerpt and extract any legal clauses present.

For each clause found, provide:
1. clause_type: One of: {clause_types}
2. content: The exact text of the clause
3. summary: A 1-2 sentence plain English summary
4. risk_level: low/medium/high/critical based on M&A implications
5. risk_factors: List of specific concerns for buyers

Contract excerpt:
{text}

Respond with a JSON array of extracted clauses. If no relevant clauses are found, return an empty array [].
Format:
[
  {{
    "clause_type": "string",
    "content": "exact clause text",
    "summary": "plain English summary",
    "risk_level": "low|medium|high|critical",
    "risk_factors": ["factor1", "factor2"]
  }}
]

Only extract clauses that are clearly present. Do not hallucinate or infer clauses that aren't explicitly stated."""


async def extract_clauses_from_chunk(
    chunk: Chunk,
    db: AsyncSession,
) -> list[Clause]:
    """
    Extract legal clauses from a single chunk using LLM.

    Args:
        chunk: Document chunk to analyze
        db: Database session

    Returns:
        List of extracted Clause objects
    """
    prompt = EXTRACTION_PROMPT.format(
        clause_types=", ".join(CLAUSE_TYPES),
        text=chunk.content,
    )

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{settings.ollama_url}/api/generate",
                json={
                    "model": settings.llm_model,
                    "prompt": prompt,
                    "stream": False,
                    "format": "json",
                    "options": {
                        "temperature": 0.1,  # Low temp for consistent extraction
                        "num_predict": 2048,
                    },
                },
            )

            if response.status_code != 200:
                return []

            data = response.json()
            response_text = data.get("response", "")

            # Parse JSON response
            try:
                clauses_data = json.loads(response_text)
                if not isinstance(clauses_data, list):
                    clauses_data = [clauses_data] if clauses_data else []
            except json.JSONDecodeError:
                # Try to extract JSON from response
                import re
                json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
                if json_match:
                    clauses_data = json.loads(json_match.group())
                else:
                    return []

            # Create Clause objects
            clauses = []
            for clause_data in clauses_data:
                if not clause_data.get("clause_type") or not clause_data.get("content"):
                    continue

                # Validate clause type
                clause_type = clause_data["clause_type"].lower().replace(" ", "_")
                if clause_type not in CLAUSE_TYPES:
                    continue

                # Assess risk
                risk_level = assess_risk(clause_type, clause_data.get("content", ""))
                if clause_data.get("risk_level") in ["critical", "high"]:
                    risk_level = clause_data["risk_level"]

                clause = Clause(
                    document_id=chunk.document_id,
                    chunk_id=chunk.id,
                    clause_type=clause_type,
                    content=clause_data["content"][:5000],  # Limit content length
                    summary=clause_data.get("summary"),
                    risk_level=risk_level,
                    confidence=0.8,  # Default confidence for LLM extraction
                    clause_metadata={
                        "risk_factors": clause_data.get("risk_factors", []),
                        "extraction_model": settings.llm_model,
                        "chunk_index": chunk.chunk_index,
                    },
                )
                clauses.append(clause)

            return clauses

    except Exception as e:
        print(f"Clause extraction error: {e}")
        return []


def assess_risk(clause_type: str, content: str) -> str:
    """
    Assess risk level of a clause based on content.

    Returns: low, medium, high, or critical
    """
    content_lower = content.lower()

    if clause_type in RISK_FACTORS:
        factors = RISK_FACTORS[clause_type]

        # Check for critical factors
        for keyword in factors.get("critical", []):
            if keyword in content_lower:
                return "critical"

        # Check for high risk factors
        for keyword in factors.get("high", []):
            if keyword in content_lower:
                return "high"

    # Default risk assessment by clause type
    high_risk_types = ["change_of_control", "ip_assignment", "indemnification"]
    if clause_type in high_risk_types:
        return "medium"

    return "low"


async def extract_clauses_from_document(
    document_id: UUID,
    db: AsyncSession,
) -> list[Clause]:
    """
    Extract all clauses from a document's chunks.

    Args:
        document_id: Document UUID
        db: Database session

    Returns:
        List of all extracted clauses
    """
    from sqlalchemy import select
    from app.services.chunking import chunk_for_clause_extraction
    from app.services.storage import get_extracted_text

    # Get extracted text from storage
    text = get_extracted_text(document_id)
    if not text:
        # Fall back to chunks
        query = select(Chunk).where(Chunk.document_id == document_id)
        result = await db.execute(query)
        chunks = result.scalars().all()
        text = "\n\n".join(c.content for c in chunks)

    # Create larger chunks for clause extraction
    text_chunks = await chunk_for_clause_extraction(text)

    all_clauses = []
    for i, chunk_text in enumerate(text_chunks):
        # Create a temporary chunk for extraction
        temp_chunk = Chunk(
            id=None,
            document_id=document_id,
            content=chunk_text,
            chunk_index=i,
        )

        clauses = await extract_clauses_from_chunk(temp_chunk, db)
        all_clauses.extend(clauses)

    # Deduplicate similar clauses
    all_clauses = deduplicate_clauses(all_clauses)

    # Save clauses to database
    for clause in all_clauses:
        db.add(clause)
    await db.commit()

    return all_clauses


def deduplicate_clauses(clauses: list[Clause]) -> list[Clause]:
    """
    Remove duplicate clauses based on content similarity.
    """
    if not clauses:
        return []

    unique_clauses = []
    seen_content = set()

    for clause in clauses:
        # Normalize content for comparison
        normalized = clause.content.lower().strip()[:200]

        if normalized not in seen_content:
            seen_content.add(normalized)
            unique_clauses.append(clause)

    return unique_clauses


async def generate_clause_summary(clause: Clause) -> str:
    """
    Generate a plain English summary of a clause.
    """
    prompt = f"""Summarize this legal clause in plain English (1-2 sentences).
Focus on what it means for a company acquiring the business.

Clause type: {clause.clause_type}
Clause text: {clause.content}

Summary:"""

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{settings.ollama_url}/api/generate",
                json={
                    "model": settings.llm_model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": 0.3, "num_predict": 200},
                },
            )

            if response.status_code == 200:
                data = response.json()
                return data.get("response", "").strip()

    except Exception:
        pass

    return ""


async def generate_document_summary(
    document_id: UUID,
    db: AsyncSession,
) -> dict:
    """
    Generate a summary of all clauses in a document.

    Returns a risk assessment summary for M&A due diligence.
    """
    from sqlalchemy import select, func

    # Get clause statistics
    query = select(
        Clause.clause_type,
        Clause.risk_level,
        func.count(Clause.id).label("count"),
    ).where(
        Clause.document_id == document_id
    ).group_by(
        Clause.clause_type, Clause.risk_level
    )

    result = await db.execute(query)
    stats = result.fetchall()

    # Count by risk level
    risk_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    clause_summary = {}

    for row in stats:
        risk_counts[row.risk_level] = risk_counts.get(row.risk_level, 0) + row.count
        if row.clause_type not in clause_summary:
            clause_summary[row.clause_type] = {"total": 0, "risk_levels": {}}
        clause_summary[row.clause_type]["total"] += row.count
        clause_summary[row.clause_type]["risk_levels"][row.risk_level] = row.count

    # Get high-risk clauses for highlights
    high_risk_query = select(Clause).where(
        Clause.document_id == document_id,
        Clause.risk_level.in_(["critical", "high"]),
    ).limit(10)

    high_risk_result = await db.execute(high_risk_query)
    high_risk_clauses = high_risk_result.scalars().all()

    return {
        "document_id": str(document_id),
        "risk_summary": risk_counts,
        "overall_risk": _calculate_overall_risk(risk_counts),
        "clause_breakdown": clause_summary,
        "high_risk_highlights": [
            {
                "clause_type": c.clause_type,
                "risk_level": c.risk_level,
                "summary": c.summary or c.content[:200],
                "risk_factors": c.clause_metadata.get("risk_factors", []),
            }
            for c in high_risk_clauses
        ],
    }


def _calculate_overall_risk(risk_counts: dict) -> str:
    """Calculate overall document risk level."""
    if risk_counts.get("critical", 0) > 0:
        return "critical"
    if risk_counts.get("high", 0) > 2:
        return "high"
    if risk_counts.get("high", 0) > 0 or risk_counts.get("medium", 0) > 5:
        return "medium"
    return "low"
