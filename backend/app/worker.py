"""Celery worker for async document processing."""

from celery import Celery
from app.core.config import get_settings

settings = get_settings()

# Initialize Celery
celery_app = Celery(
    "contractclarity",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["app.tasks.document_tasks"],
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes max per task
    task_soft_time_limit=25 * 60,  # Soft limit at 25 minutes
    worker_prefetch_multiplier=1,  # Process one task at a time
    task_acks_late=True,  # Acknowledge after task completes
    task_reject_on_worker_lost=True,  # Requeue if worker dies
)

# Task routing (optional - for scaling specific tasks)
celery_app.conf.task_routes = {
    "app.tasks.document_tasks.process_document": {"queue": "documents"},
    "app.tasks.document_tasks.generate_embeddings": {"queue": "embeddings"},
}
