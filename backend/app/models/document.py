"""Document models for contract storage."""

from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4
from sqlalchemy import String, Integer, Float, Text, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID as PgUUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector
from app.core.database import Base


class Document(Base):
    """Uploaded contract document."""

    __tablename__ = "documents"

    id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size: Mapped[Optional[int]] = mapped_column(Integer)
    file_type: Mapped[Optional[str]] = mapped_column(String(50))
    page_count: Mapped[Optional[int]] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(50), default="pending")
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    doc_metadata: Mapped[dict] = mapped_column(JSONB, default=dict, name="metadata")

    # Relationships
    chunks: Mapped[list["Chunk"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )
    clauses: Mapped[list["Clause"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )
    entities: Mapped[list["Entity"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )


class Chunk(Base):
    """Document chunk with vector embedding."""

    __tablename__ = "chunks"

    id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    document_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE")
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    page_number: Mapped[Optional[int]] = mapped_column(Integer)
    embedding = mapped_column(Vector(768))  # nomic-embed-text dimension
    chunk_metadata: Mapped[dict] = mapped_column(JSONB, default=dict, name="metadata")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    document: Mapped["Document"] = relationship(back_populates="chunks")
    clauses: Mapped[list["Clause"]] = relationship(back_populates="chunk")


class Clause(Base):
    """Extracted contract clause."""

    __tablename__ = "clauses"

    id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    document_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE")
    )
    chunk_id: Mapped[Optional[UUID]] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("chunks.id", ondelete="CASCADE")
    )
    clause_type: Mapped[str] = mapped_column(String(100), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[Optional[str]] = mapped_column(Text)
    risk_level: Mapped[Optional[str]] = mapped_column(String(20))
    confidence: Mapped[Optional[float]] = mapped_column(Float)
    clause_metadata: Mapped[dict] = mapped_column(JSONB, default=dict, name="metadata")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    document: Mapped["Document"] = relationship(back_populates="clauses")
    chunk: Mapped[Optional["Chunk"]] = relationship(back_populates="clauses")
