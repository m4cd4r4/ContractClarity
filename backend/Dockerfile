FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for OCR
RUN apt-get update && apt-get install -y \
    build-essential \
    # Tesseract OCR
    tesseract-ocr \
    tesseract-ocr-eng \
    # Poppler for pdf2image
    poppler-utils \
    # Image processing (libgl1 replaces obsolete libgl1-mesa-glx)
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    # Cleanup
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY requirements.txt .

# Install Python dependencies
# Note: PaddleOCR has large dependencies, install separately for better caching
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create directories
RUN mkdir -p /app/uploads /app/temp

# Expose port
EXPOSE 8000

# Default command (overridden by docker-compose)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
