"""Application configuration."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Application
    app_name: str = "ContractClarity"
    environment: str = "development"
    debug: bool = True

    # Database
    database_url: str = "postgresql://contractclarity:contractclarity_dev@localhost:5433/contractclarity"

    # Redis / Celery
    redis_url: str = "redis://localhost:6380/0"
    celery_broker_url: str = "redis://localhost:6380/0"
    celery_result_backend: str = "redis://localhost:6380/0"

    # MinIO (S3-compatible storage)
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "contractclarity"
    minio_secret_key: str = "contractclarity_dev"
    minio_bucket: str = "contracts"
    minio_secure: bool = False  # Use HTTPS in production

    # Ollama
    ollama_url: str = "http://localhost:11435"
    llm_model: str = "llama3.2"
    embedding_model: str = "nomic-embed-text"
    vision_model: str = "llava"  # For OCR Tier 4 (Pixtral alternative)

    # File upload
    max_file_size: int = 50 * 1024 * 1024  # 50MB

    # Chunking (optimized for legal documents)
    # ~1500 tokens ≈ 6000 characters for legal text
    chunk_size: int = 6000
    chunk_overlap: int = 600

    # OCR Settings
    ocr_confidence_threshold: float = 0.80  # Below this, try next tier
    ocr_dpi: int = 300  # DPI for PDF to image conversion
    tesseract_lang: str = "eng"  # Tesseract language

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
