"""Document upload and management endpoints."""

from uuid import UUID
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from app.core.database import get_db
from app.core.config import get_settings
from app.models.document import Document
from app.services.storage import upload_document as minio_upload, delete_document as minio_delete, get_document_url

router = APIRouter(prefix="/documents", tags=["documents"])
settings = get_settings()


class DocumentResponse(BaseModel):
    """Document response schema."""

    id: UUID
    filename: str
    file_size: int | None
    file_type: str | None
    page_count: int | None
    status: str
    chunk_count: int = 0
    metadata: dict = {}

    class Config:
        from_attributes = True


class DocumentDetailResponse(DocumentResponse):
    """Detailed document response with download URL."""

    download_url: str | None = None


class DocumentListResponse(BaseModel):
    """List of documents response."""

    documents: list[DocumentResponse]
    total: int
    skip: int
    limit: int


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a contract document (PDF).

    The document will be stored in MinIO and processed asynchronously by Celery:
    1. Store in MinIO
    2. Extract text (4-tier OCR pipeline)
    3. Chunk the text
    4. Generate embeddings
    5. Store in database
    """
    # Validate file type
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    # Read file content
    content = await file.read()

    # Check file size
    if len(content) > settings.max_file_size:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {settings.max_file_size // (1024*1024)}MB",
        )

    # Create document record
    doc = Document(
        filename=file.filename,
        file_path="",  # Will be set after MinIO upload
        file_size=len(content),
        file_type="application/pdf",
        status="uploading",
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    try:
        # Upload to MinIO
        object_path = minio_upload(doc.id, content)
        doc.file_path = object_path
        doc.status = "queued"
        await db.commit()

        # Queue Celery task for processing
        from app.tasks.document_tasks import process_document
        process_document.delay(str(doc.id))

        return DocumentResponse(
            id=doc.id,
            filename=doc.filename,
            file_size=doc.file_size,
            file_type=doc.file_type,
            page_count=doc.page_count,
            status=doc.status,
            metadata=doc.doc_metadata,
        )

    except Exception as e:
        # Cleanup on failure
        doc.status = "failed"
        doc.doc_metadata = {"error": str(e)}
        await db.commit()
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    skip: int = 0,
    limit: int = 20,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """
    List all uploaded documents.

    Args:
        skip: Number of documents to skip (pagination)
        limit: Maximum documents to return
        status: Filter by status (queued, processing, completed, failed)
    """
    # Build query
    query = select(Document).options(selectinload(Document.chunks))

    if status:
        query = query.where(Document.status == status)

    query = query.offset(skip).limit(limit).order_by(Document.uploaded_at.desc())

    result = await db.execute(query)
    documents = result.scalars().all()

    # Get total count
    count_query = select(func.count(Document.id))
    if status:
        count_query = count_query.where(Document.status == status)
    count_result = await db.execute(count_query)
    total = count_result.scalar()

    doc_responses = [
        DocumentResponse(
            id=doc.id,
            filename=doc.filename,
            file_size=doc.file_size,
            file_type=doc.file_type,
            page_count=doc.page_count,
            status=doc.status,
            chunk_count=len(doc.chunks) if doc.chunks else 0,
            metadata=doc.doc_metadata,
        )
        for doc in documents
    ]

    return DocumentListResponse(
        documents=doc_responses,
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/{document_id}", response_model=DocumentDetailResponse)
async def get_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific document by ID with download URL."""
    query = (
        select(Document)
        .where(Document.id == document_id)
        .options(selectinload(Document.chunks))
    )
    result = await db.execute(query)
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Generate presigned download URL
    download_url = None
    if doc.status == "completed":
        try:
            download_url = get_document_url(doc.id)
        except Exception:
            pass

    return DocumentDetailResponse(
        id=doc.id,
        filename=doc.filename,
        file_size=doc.file_size,
        file_type=doc.file_type,
        page_count=doc.page_count,
        status=doc.status,
        chunk_count=len(doc.chunks) if doc.chunks else 0,
        metadata=doc.doc_metadata,
        download_url=download_url,
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

    # Delete from MinIO
    try:
        minio_delete(document_id)
    except Exception:
        pass  # Continue even if MinIO delete fails

    # Delete from database (cascades to chunks and clauses)
    await db.delete(doc)
    await db.commit()

    return {"status": "deleted", "document_id": str(document_id)}


@router.post("/{document_id}/reprocess")
async def reprocess_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Reprocess a document.

    Useful if processing failed or you want to regenerate embeddings.
    """
    query = select(Document).where(Document.id == document_id)
    result = await db.execute(query)
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.status == "processing":
        raise HTTPException(status_code=400, detail="Document is already processing")

    # Reset status and queue for reprocessing
    doc.status = "queued"
    doc.doc_metadata = {**doc.doc_metadata, "reprocessed": True}
    await db.commit()

    # Queue Celery task
    from app.tasks.document_tasks import process_document
    process_document.delay(str(doc.id))

    return {"status": "queued", "document_id": str(document_id)}


@router.get("/{document_id}/chunks")
async def get_document_chunks(
    document_id: UUID,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """Get chunks for a document."""
    from app.models.document import Chunk

    # Verify document exists
    doc_query = select(Document).where(Document.id == document_id)
    doc_result = await db.execute(doc_query)
    doc = doc_result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Get chunks
    query = (
        select(Chunk)
        .where(Chunk.document_id == document_id)
        .offset(skip)
        .limit(limit)
        .order_by(Chunk.chunk_index)
    )
    result = await db.execute(query)
    chunks = result.scalars().all()

    return {
        "document_id": str(document_id),
        "chunks": [
            {
                "id": str(chunk.id),
                "chunk_index": chunk.chunk_index,
                "page_number": chunk.page_number,
                "content": chunk.content,
                "has_embedding": chunk.embedding is not None,
                "metadata": chunk.chunk_metadata,
            }
            for chunk in chunks
        ],
        "total": len(doc.chunks) if doc.chunks else 0,
        "skip": skip,
        "limit": limit,
    }
