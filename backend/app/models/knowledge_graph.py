"""Knowledge graph models for entity and relationship storage."""

from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4
from sqlalchemy import String, Integer, Float, Text, ForeignKey, DateTime, func, Index
from sqlalchemy.dialects.postgresql import UUID as PgUUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Entity(Base):
    """
    Extracted entity from contracts.

    Entity types include:
    - party: Companies, individuals involved in contracts
    - date: Important dates (effective date, expiration, etc.)
    - amount: Monetary values and quantities
    - location: Addresses, jurisdictions
    - person: Named individuals
    - term: Contract terms (duration, renewal periods)
    """

    __tablename__ = "entities"

    id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    document_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE")
    )
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    normalized_name: Mapped[Optional[str]] = mapped_column(String(500))
    value: Mapped[Optional[str]] = mapped_column(Text)  # For dates, amounts, etc.
    confidence: Mapped[Optional[float]] = mapped_column(Float)
    context: Mapped[Optional[str]] = mapped_column(Text)  # Surrounding text
    page_number: Mapped[Optional[int]] = mapped_column(Integer)
    entity_metadata: Mapped[dict] = mapped_column(JSONB, default=dict, name="metadata")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    document: Mapped["Document"] = relationship(back_populates="entities")
    source_relations: Mapped[list["Relationship"]] = relationship(
        back_populates="source_entity",
        foreign_keys="Relationship.source_entity_id",
        cascade="all, delete-orphan",
    )
    target_relations: Mapped[list["Relationship"]] = relationship(
        back_populates="target_entity",
        foreign_keys="Relationship.target_entity_id",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_entities_document_type", "document_id", "entity_type"),
        Index("ix_entities_normalized_name", "normalized_name"),
    )


class Relationship(Base):
    """
    Relationship between two entities.

    Relationship types include:
    - party_to_contract: Party signs/enters contract
    - governs: Jurisdiction governs contract
    - effective_date: Contract effective on date
    - expires_on: Contract expires on date
    - amount_payable: Payment obligation
    - employs: Company employs person
    - subsidiary_of: Company is subsidiary
    - controls: Entity controls another
    """

    __tablename__ = "relationships"

    id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    document_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE")
    )
    source_entity_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("entities.id", ondelete="CASCADE")
    )
    target_entity_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("entities.id", ondelete="CASCADE")
    )
    relationship_type: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    confidence: Mapped[Optional[float]] = mapped_column(Float)
    relationship_metadata: Mapped[dict] = mapped_column(JSONB, default=dict, name="metadata")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    document: Mapped["Document"] = relationship()
    source_entity: Mapped["Entity"] = relationship(
        back_populates="source_relations",
        foreign_keys=[source_entity_id],
    )
    target_entity: Mapped["Entity"] = relationship(
        back_populates="target_relations",
        foreign_keys=[target_entity_id],
    )

    __table_args__ = (
        Index("ix_relationships_document", "document_id"),
        Index("ix_relationships_type", "relationship_type"),
        Index("ix_relationships_source", "source_entity_id"),
        Index("ix_relationships_target", "target_entity_id"),
    )


# Import Document to complete relationship
from app.models.document import Document
