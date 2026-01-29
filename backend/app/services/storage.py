"""MinIO storage service for document management."""

import io
from uuid import UUID
from minio import Minio
from minio.error import S3Error
from app.core.config import get_settings

settings = get_settings()

# Initialize MinIO client
minio_client = Minio(
    settings.minio_endpoint,
    access_key=settings.minio_access_key,
    secret_key=settings.minio_secret_key,
    secure=settings.minio_secure,
)


def ensure_bucket_exists() -> None:
    """Create the contracts bucket if it doesn't exist."""
    try:
        if not minio_client.bucket_exists(settings.minio_bucket):
            minio_client.make_bucket(settings.minio_bucket)
    except S3Error as e:
        raise RuntimeError(f"Failed to create bucket: {e}")


def upload_document(document_id: UUID, content: bytes, content_type: str = "application/pdf") -> str:
    """
    Upload a document to MinIO.

    Args:
        document_id: UUID of the document
        content: File content as bytes
        content_type: MIME type of the file

    Returns:
        Object path in MinIO
    """
    ensure_bucket_exists()

    object_name = f"documents/{document_id}/original.pdf"

    minio_client.put_object(
        bucket_name=settings.minio_bucket,
        object_name=object_name,
        data=io.BytesIO(content),
        length=len(content),
        content_type=content_type,
    )

    return object_name


def download_document(document_id: UUID) -> bytes:
    """
    Download a document from MinIO.

    Args:
        document_id: UUID of the document

    Returns:
        File content as bytes
    """
    object_name = f"documents/{document_id}/original.pdf"

    try:
        response = minio_client.get_object(
            bucket_name=settings.minio_bucket,
            object_name=object_name,
        )
        return response.read()
    finally:
        response.close()
        response.release_conn()


def store_extracted_text(document_id: UUID, text: str) -> str:
    """
    Store extracted text for a document.

    Args:
        document_id: UUID of the document
        text: Extracted text content

    Returns:
        Object path in MinIO
    """
    ensure_bucket_exists()

    object_name = f"documents/{document_id}/extracted.txt"
    content = text.encode("utf-8")

    minio_client.put_object(
        bucket_name=settings.minio_bucket,
        object_name=object_name,
        data=io.BytesIO(content),
        length=len(content),
        content_type="text/plain; charset=utf-8",
    )

    return object_name


def get_extracted_text(document_id: UUID) -> str | None:
    """
    Get previously extracted text for a document.

    Args:
        document_id: UUID of the document

    Returns:
        Extracted text or None if not found
    """
    object_name = f"documents/{document_id}/extracted.txt"

    try:
        response = minio_client.get_object(
            bucket_name=settings.minio_bucket,
            object_name=object_name,
        )
        return response.read().decode("utf-8")
    except S3Error:
        return None
    finally:
        try:
            response.close()
            response.release_conn()
        except Exception:
            pass


def delete_document(document_id: UUID) -> None:
    """
    Delete all files associated with a document.

    Args:
        document_id: UUID of the document
    """
    prefix = f"documents/{document_id}/"

    # List all objects with this prefix
    objects = minio_client.list_objects(
        bucket_name=settings.minio_bucket,
        prefix=prefix,
        recursive=True,
    )

    # Delete each object
    for obj in objects:
        minio_client.remove_object(
            bucket_name=settings.minio_bucket,
            object_name=obj.object_name,
        )


def get_document_url(document_id: UUID, expires_hours: int = 1) -> str:
    """
    Get a presigned URL for downloading a document.

    Args:
        document_id: UUID of the document
        expires_hours: URL expiration time in hours

    Returns:
        Presigned URL
    """
    from datetime import timedelta

    object_name = f"documents/{document_id}/original.pdf"

    return minio_client.presigned_get_object(
        bucket_name=settings.minio_bucket,
        object_name=object_name,
        expires=timedelta(hours=expires_hours),
    )
