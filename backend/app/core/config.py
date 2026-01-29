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

    # Redis
    redis_url: str = "redis://localhost:6380/0"

    # Ollama
    ollama_url: str = "http://localhost:11435"
    llm_model: str = "llama3.2"
    embedding_model: str = "nomic-embed-text"

    # File upload
    upload_dir: str = "./uploads"
    max_file_size: int = 50 * 1024 * 1024  # 50MB

    # Chunking (optimized for legal documents)
    # ~1500 tokens ≈ 6000 characters for legal text
    chunk_size: int = 6000
    chunk_overlap: int = 600

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
