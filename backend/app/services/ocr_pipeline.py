"""
4-Tier OCR Pipeline for document text extraction.

Tier 0: PyMuPDF (native PDF text) - 95% of cases
Tier 1: Tesseract OCR (clean scans) - 90-95% accuracy
Tier 2: PaddleOCR (complex layouts) - 90-95% accuracy
Tier 3: Vision LLM (handwriting, poor quality) - 85-90% accuracy
"""

import io
import re
import tempfile
from pathlib import Path
import fitz  # PyMuPDF
import httpx
from PIL import Image
from app.core.config import get_settings

settings = get_settings()


async def extract_text_with_ocr(pdf_content: bytes) -> dict:
    """
    Extract text from PDF using 4-tier OCR pipeline.

    Args:
        pdf_content: PDF file as bytes

    Returns:
        dict with keys:
            - text: Extracted text
            - page_count: Number of pages
            - tier_used: Which OCR tier was used (0-3)
            - confidence: Extraction confidence (0-1)
    """
    # Open PDF
    doc = fitz.open(stream=pdf_content, filetype="pdf")
    page_count = len(doc)

    try:
        # Tier 0: Try native PDF extraction first
        text, is_native = _extract_native_text(doc)

        if is_native and _text_quality_check(text, page_count):
            return {
                "text": text,
                "page_count": page_count,
                "tier_used": 0,
                "confidence": 1.0,
                "method": "native_pdf",
            }

        # Need OCR - convert pages to images
        images = _pdf_to_images(doc)

        # Tier 1: Tesseract for clean scans
        text, confidence = await _tesseract_ocr(images)

        if confidence >= settings.ocr_confidence_threshold:
            return {
                "text": text,
                "page_count": page_count,
                "tier_used": 1,
                "confidence": confidence,
                "method": "tesseract",
            }

        # Tier 2: PaddleOCR for complex layouts
        text, confidence = await _paddle_ocr(images)

        if confidence >= settings.ocr_confidence_threshold * 0.9:  # Slightly lower threshold
            return {
                "text": text,
                "page_count": page_count,
                "tier_used": 2,
                "confidence": confidence,
                "method": "paddleocr",
            }

        # Tier 3: Vision LLM for difficult cases
        text, confidence = await _vision_llm_ocr(images)

        return {
            "text": text,
            "page_count": page_count,
            "tier_used": 3,
            "confidence": confidence,
            "method": "vision_llm",
        }

    finally:
        doc.close()


def _extract_native_text(doc: fitz.Document) -> tuple[str, bool]:
    """
    Extract text from native PDF (not scanned).

    Returns:
        Tuple of (text, is_native_pdf)
    """
    text_parts = []
    has_text = False

    for page_num, page in enumerate(doc):
        page_text = page.get_text("text")

        if page_text.strip():
            has_text = True
            text_parts.append(f"\n--- Page {page_num + 1} ---\n")
            text_parts.append(page_text)

    text = "".join(text_parts)
    text = _clean_text(text)

    # If we got substantial text, it's a native PDF
    is_native = has_text and len(text) > 100

    return text, is_native


def _text_quality_check(text: str, page_count: int) -> bool:
    """
    Check if extracted text is high quality.

    Returns True if text appears to be properly extracted.
    """
    if not text or len(text) < 50:
        return False

    # Check for minimum characters per page (legal docs are text-heavy)
    chars_per_page = len(text) / max(page_count, 1)
    if chars_per_page < 200:  # Very low for a contract
        return False

    # Check for gibberish ratio (non-ASCII, weird characters)
    ascii_ratio = sum(1 for c in text if c.isascii()) / len(text)
    if ascii_ratio < 0.85:
        return False

    # Check for word-like content
    words = text.split()
    if len(words) < 50:
        return False

    # Check for reasonable word lengths (average 3-15 chars)
    avg_word_len = sum(len(w) for w in words) / len(words)
    if avg_word_len < 2 or avg_word_len > 20:
        return False

    return True


def _pdf_to_images(doc: fitz.Document) -> list[Image.Image]:
    """Convert PDF pages to PIL Images for OCR."""
    images = []
    dpi = settings.ocr_dpi
    zoom = dpi / 72  # 72 is default PDF DPI

    for page in doc:
        # Render page to pixmap
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat)

        # Convert to PIL Image
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        images.append(img)

    return images


async def _tesseract_ocr(images: list[Image.Image]) -> tuple[str, float]:
    """
    Tier 1: Tesseract OCR for clean scans.

    Returns:
        Tuple of (text, confidence)
    """
    try:
        import pytesseract

        text_parts = []
        confidences = []

        for page_num, img in enumerate(images):
            # Get OCR data with confidence scores
            data = pytesseract.image_to_data(
                img,
                lang=settings.tesseract_lang,
                output_type=pytesseract.Output.DICT,
            )

            # Extract text and confidence
            page_text = pytesseract.image_to_string(img, lang=settings.tesseract_lang)

            if page_text.strip():
                text_parts.append(f"\n--- Page {page_num + 1} ---\n")
                text_parts.append(page_text)

            # Calculate average confidence for this page
            conf_values = [int(c) for c in data["conf"] if int(c) > 0]
            if conf_values:
                confidences.append(sum(conf_values) / len(conf_values) / 100)

        text = "".join(text_parts)
        text = _clean_text(text)

        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.5

        return text, avg_confidence

    except Exception as e:
        # Tesseract not available or failed
        return "", 0.0


async def _paddle_ocr(images: list[Image.Image]) -> tuple[str, float]:
    """
    Tier 2: PaddleOCR for complex layouts, tables, multi-column.

    Returns:
        Tuple of (text, confidence)
    """
    try:
        from paddleocr import PaddleOCR

        # Initialize PaddleOCR (English, no GPU for now)
        ocr = PaddleOCR(use_angle_cls=True, lang="en", use_gpu=False, show_log=False)

        text_parts = []
        confidences = []

        for page_num, img in enumerate(images):
            # Convert PIL to numpy array
            import numpy as np
            img_array = np.array(img)

            # Run OCR
            result = ocr.ocr(img_array, cls=True)

            if result and result[0]:
                page_lines = []
                page_confs = []

                for line in result[0]:
                    if line and len(line) >= 2:
                        text_info = line[1]
                        if isinstance(text_info, tuple) and len(text_info) >= 2:
                            page_lines.append(text_info[0])
                            page_confs.append(text_info[1])

                if page_lines:
                    text_parts.append(f"\n--- Page {page_num + 1} ---\n")
                    text_parts.append("\n".join(page_lines))

                if page_confs:
                    confidences.extend(page_confs)

        text = "".join(text_parts)
        text = _clean_text(text)

        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.5

        return text, avg_confidence

    except Exception as e:
        # PaddleOCR not available or failed
        return "", 0.0


async def _vision_llm_ocr(images: list[Image.Image]) -> tuple[str, float]:
    """
    Tier 3: Vision LLM for handwriting, poor quality, complex documents.

    Uses Ollama with a vision model (llava, pixtral, etc.)

    Returns:
        Tuple of (text, confidence)
    """
    try:
        text_parts = []

        async with httpx.AsyncClient(timeout=120.0) as client:
            for page_num, img in enumerate(images):
                # Convert image to base64
                import base64
                buffer = io.BytesIO()
                img.save(buffer, format="PNG")
                img_base64 = base64.b64encode(buffer.getvalue()).decode()

                # Call Ollama with vision model
                response = await client.post(
                    f"{settings.ollama_url}/api/generate",
                    json={
                        "model": settings.vision_model,
                        "prompt": (
                            "Extract ALL text from this document image. "
                            "Preserve the structure and formatting as much as possible. "
                            "Include all text you can see, even if partially obscured. "
                            "Output only the extracted text, no commentary."
                        ),
                        "images": [img_base64],
                        "stream": False,
                    },
                )

                if response.status_code == 200:
                    data = response.json()
                    page_text = data.get("response", "")

                    if page_text.strip():
                        text_parts.append(f"\n--- Page {page_num + 1} ---\n")
                        text_parts.append(page_text)

        text = "".join(text_parts)
        text = _clean_text(text)

        # Vision LLM confidence is estimated (no direct confidence scores)
        confidence = 0.85 if text else 0.0

        return text, confidence

    except Exception as e:
        # Vision LLM not available or failed
        return "", 0.0


def _clean_text(text: str) -> str:
    """Clean up extracted text."""
    # Normalize line breaks
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    # Remove excessive blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)

    # Remove excessive spaces
    text = re.sub(r" {2,}", " ", text)

    # Remove leading/trailing whitespace from lines
    lines = [line.strip() for line in text.split("\n")]
    text = "\n".join(lines)

    return text.strip()
