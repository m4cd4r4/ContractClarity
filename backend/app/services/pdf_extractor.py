"""PDF text extraction using PyMuPDF."""

import fitz  # PyMuPDF
from pathlib import Path


async def extract_text_from_pdf(file_path: str) -> tuple[str, int]:
    """
    Extract text content from a PDF file.

    Uses PyMuPDF (fitz) for native text extraction.
    For scanned PDFs, OCR would be needed (not implemented in MVP).

    Args:
        file_path: Path to the PDF file

    Returns:
        Tuple of (extracted_text, page_count)
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"PDF file not found: {file_path}")

    text_parts = []
    page_count = 0

    # Open PDF with PyMuPDF
    doc = fitz.open(file_path)

    try:
        page_count = len(doc)

        for page_num, page in enumerate(doc):
            # Extract text from page
            page_text = page.get_text("text")

            if page_text.strip():
                # Add page marker for tracking
                text_parts.append(f"\n--- Page {page_num + 1} ---\n")
                text_parts.append(page_text)

    finally:
        doc.close()

    full_text = "".join(text_parts)

    # Basic cleanup
    full_text = clean_extracted_text(full_text)

    return full_text, page_count


def clean_extracted_text(text: str) -> str:
    """
    Clean up extracted PDF text.

    - Remove excessive whitespace
    - Normalize line breaks
    - Remove common artifacts
    """
    import re

    # Normalize line breaks
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    # Remove excessive blank lines (more than 2)
    text = re.sub(r"\n{3,}", "\n\n", text)

    # Remove excessive spaces
    text = re.sub(r" {2,}", " ", text)

    # Remove leading/trailing whitespace from lines
    lines = [line.strip() for line in text.split("\n")]
    text = "\n".join(lines)

    return text.strip()


async def get_pdf_metadata(file_path: str) -> dict:
    """
    Extract metadata from a PDF file.

    Returns:
        Dictionary with title, author, creation_date, etc.
    """
    doc = fitz.open(file_path)

    try:
        metadata = doc.metadata
        return {
            "title": metadata.get("title", ""),
            "author": metadata.get("author", ""),
            "subject": metadata.get("subject", ""),
            "creator": metadata.get("creator", ""),
            "producer": metadata.get("producer", ""),
            "creation_date": metadata.get("creationDate", ""),
            "modification_date": metadata.get("modDate", ""),
            "page_count": len(doc),
        }
    finally:
        doc.close()
