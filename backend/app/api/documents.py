"""Document upload and management endpoints."""

import os
from uuid import UUID
from pathlib import Path
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from app.core.database import get_db
from app.core.config import get_settings
from app.models.document import Document
from app.services.pdf_extractor import extract_text_from_pdf
from app.services.chunking import chunk_document
from app.services.embeddings import generate_embeddings

router = APIRouter(prefix="/documents", tags=["documents"])
settings = get_settings()


class DocumentResponse(BaseModel):
    """Document response schema."""

    id: UUID
    filename: str
    file_size: int | None
    page_count: int | None
    status: str
    chunk_count: int = 0

    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    """List of documents response."""

    documents: list[DocumentResponse]
    total: int


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a contract document (PDF).

    The document will be processed in the background:
    1. Extract text from PDF
    2. Chunk the text
    3. Generate embeddings
    4. Store in database
    """
    # Validate file type
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    # Check file size
    content = await file.read()
    if len(content) > settings.max_file_size:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {settings.max_file_size // (1024*1024)}MB",
        )

    # Create upload directory if needed
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)

    # Create document record
    doc = Document(
        filename=file.filename,
        file_path="",  # Will be set after saving
        file_size=len(content),
        file_type="application/pdf",
        status="uploading",
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    # Save file with document ID as filename
    file_path = upload_dir / f"{doc.id}.pdf"
    with open(file_path, "wb") as f:
        f.write(content)

    # Update file path
    doc.file_path = str(file_path)
    doc.status = "uploaded"
    await db.commit()

    # Process in background
    background_tasks.add_task(process_document, str(doc.id))

    return DocumentResponse(
        id=doc.id,
        filename=doc.filename,
        file_size=doc.file_size,
        page_count=doc.page_count,
        status=doc.status,
    )


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    """List all uploaded documents."""
    # Get documents
    query = select(Document).offset(skip).limit(limit).order_by(Document.uploaded_at.desc())
    result = await db.execute(query)
    documents = result.scalars().all()

    # Get total count
    count_query = select(Document)
    count_result = await db.execute(count_query)
    total = len(count_result.scalars().all())

    doc_responses = []
    for doc in documents:
        doc_responses.append(
            DocumentResponse(
                id=doc.id,
                filename=doc.filename,
                file_size=doc.file_size,
                page_count=doc.page_count,
                status=doc.status,
                chunk_count=len(doc.chunks) if doc.chunks else 0,
            )
        )

    return DocumentListResponse(documents=doc_responses, total=total)


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific document by ID."""
    query = select(Document).where(Document.id == document_id)
    result = await db.execute(query)
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    return DocumentResponse(
        id=doc.id,
        filename=doc.filename,
        file_size=doc.file_size,
        page_count=doc.page_count,
        status=doc.status,
        chunk_count=len(doc.chunks) if doc.chunks else 0,
    )


@router.delete("/{document_id}")
async def delete_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete a document and all associated data."""
    query = select(Document).where(Document.id == document_id)
    result = await db.execute(query)
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete file from disk
    if doc.file_path and os.path.exists(doc.file_path):
        os.remove(doc.file_path)

    # Delete from database (cascades to chunks and clauses)
    await db.delete(doc)
    await db.commit()

    return {"status": "deleted", "document_id": str(document_id)}


async def process_document(document_id: str):
    """
    Background task to process an uploaded document.

    1. Extract text from PDF
    2. Chunk the text
    3. Generate embeddings
    4. Store chunks in database
    """
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        try:
            # Get document
            query = select(Document).where(Document.id == UUID(document_id))
            result = await db.execute(query)
            doc = result.scalar_one_or_none()

            if not doc:
                return

            # Update status
            doc.status = "processing"
            await db.commit()

            # Extract text
            text, page_count = await extract_text_from_pdf(doc.file_path)
            doc.page_count = page_count

            # Chunk text
            chunks = await chunk_document(text, doc.id)

            # Generate embeddings and store
            await generate_embeddings(chunks, db)

            # Update status
            doc.status = "completed"
            await db.commit()

        except Exception as e:
            doc.status = "failed"
            doc.metadata = {"error": str(e)}
            await db.commit()
            raise
