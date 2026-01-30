"""Document analysis endpoints for clause extraction and risk assessment."""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from app.core.database import get_db
from app.models.document import Document, Clause
from app.services.clause_extraction import (
    extract_clauses_from_document,
    generate_document_summary,
    CLAUSE_TYPES,
)

router = APIRouter(prefix="/analysis", tags=["analysis"])


class ClauseResponse(BaseModel):
    """Response model for a single clause."""

    id: UUID
    document_id: UUID
    clause_type: str
    content: str
    summary: str | None
    risk_level: str | None
    confidence: float | None
    risk_factors: list[str] = []

    class Config:
        from_attributes = True


class AnalysisResponse(BaseModel):
    """Response model for document analysis."""

    document_id: UUID
    status: str
    clauses_extracted: int
    risk_summary: dict
    overall_risk: str
    clause_breakdown: dict
    high_risk_highlights: list[dict]


class AnalysisStatusResponse(BaseModel):
    """Response for analysis status check."""

    document_id: UUID
    status: str
    clauses_found: int
    message: str


@router.post("/{document_id}/extract", response_model=AnalysisStatusResponse)
async def trigger_extraction(
    document_id: UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    Trigger clause extraction for a document.

    This starts an asynchronous extraction process using LLM.
    The document must be in 'completed' status.
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
            detail=f"Document must be in 'completed' status. Current: {doc.status}",
        )

    # Check if already analyzed
    clause_query = select(Clause).where(Clause.document_id == document_id).limit(1)
    clause_result = await db.execute(clause_query)
    existing_clause = clause_result.scalar_one_or_none()

    if existing_clause:
        # Count existing clauses
        from sqlalchemy import func
        count_query = select(func.count(Clause.id)).where(Clause.document_id == document_id)
        count_result = await db.execute(count_query)
        clause_count = count_result.scalar()

        return AnalysisStatusResponse(
            document_id=document_id,
            status="completed",
            clauses_found=clause_count,
            message="Document already analyzed. Use /analysis/{id}/reanalyze to re-extract.",
        )

    # Queue background extraction
    background_tasks.add_task(run_extraction, document_id)

    return AnalysisStatusResponse(
        document_id=document_id,
        status="queued",
        clauses_found=0,
        message="Clause extraction started. Check /analysis/{id}/summary for results.",
    )


@router.post("/{document_id}/reanalyze", response_model=AnalysisStatusResponse)
async def reanalyze_document(
    document_id: UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    Re-extract clauses from a document.

    This deletes existing clauses and runs extraction again.
    """
    # Verify document exists
    query = select(Document).where(Document.id == document_id)
    result = await db.execute(query)
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete existing clauses
    from sqlalchemy import delete
    delete_query = delete(Clause).where(Clause.document_id == document_id)
    await db.execute(delete_query)
    await db.commit()

    # Queue background extraction
    background_tasks.add_task(run_extraction, document_id)

    return AnalysisStatusResponse(
        document_id=document_id,
        status="queued",
        clauses_found=0,
        message="Re-analysis started. Previous clauses deleted.",
    )


@router.get("/{document_id}/summary", response_model=AnalysisResponse)
async def get_analysis_summary(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Get analysis summary for a document.

    Returns risk assessment and clause breakdown.
    """
    # Verify document exists
    query = select(Document).where(Document.id == document_id)
    result = await db.execute(query)
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Generate summary
    summary = await generate_document_summary(document_id, db)

    # Count clauses
    from sqlalchemy import func
    count_query = select(func.count(Clause.id)).where(Clause.document_id == document_id)
    count_result = await db.execute(count_query)
    clause_count = count_result.scalar()

    return AnalysisResponse(
        document_id=document_id,
        status="completed" if clause_count > 0 else "pending",
        clauses_extracted=clause_count,
        risk_summary=summary["risk_summary"],
        overall_risk=summary["overall_risk"],
        clause_breakdown=summary["clause_breakdown"],
        high_risk_highlights=summary["high_risk_highlights"],
    )


@router.get("/{document_id}/clauses", response_model=list[ClauseResponse])
async def get_document_clauses(
    document_id: UUID,
    clause_type: str | None = None,
    risk_level: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Get all extracted clauses for a document.

    Optionally filter by clause type or risk level.
    """
    query = select(Clause).where(Clause.document_id == document_id)

    if clause_type:
        query = query.where(Clause.clause_type == clause_type)
    if risk_level:
        query = query.where(Clause.risk_level == risk_level)

    query = query.order_by(Clause.clause_type, Clause.created_at)
    result = await db.execute(query)
    clauses = result.scalars().all()

    return [
        ClauseResponse(
            id=c.id,
            document_id=c.document_id,
            clause_type=c.clause_type,
            content=c.content,
            summary=c.summary,
            risk_level=c.risk_level,
            confidence=c.confidence,
            risk_factors=c.clause_metadata.get("risk_factors", []),
        )
        for c in clauses
    ]


@router.get("/clause-types")
async def list_clause_types():
    """
    List all supported clause types.

    Returns clause types that can be extracted from contracts.
    """
    return {
        "clause_types": CLAUSE_TYPES,
        "descriptions": {
            "change_of_control": "Provisions triggered by ownership changes",
            "termination": "Contract termination conditions and notice periods",
            "ip_assignment": "Intellectual property ownership and transfer",
            "indemnification": "Protection against third-party claims",
            "limitation_of_liability": "Caps on damages and liability",
            "confidentiality": "NDA and information protection clauses",
            "non_compete": "Restrictions on competitive activities",
            "non_solicitation": "Employee and customer non-solicitation",
            "payment_terms": "Payment schedules and conditions",
            "warranty": "Warranties and representations",
            "governing_law": "Jurisdiction and applicable law",
            "dispute_resolution": "Arbitration and litigation procedures",
            "force_majeure": "Unforeseeable circumstance provisions",
            "assignment": "Contract assignment and transfer rights",
            "audit_rights": "Financial and operational audit provisions",
            "data_protection": "GDPR and data privacy clauses",
        },
    }


async def run_extraction(document_id: UUID):
    """Background task to run clause extraction."""
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        try:
            await extract_clauses_from_document(document_id, db)
        except Exception as e:
            print(f"Extraction error for {document_id}: {e}")
