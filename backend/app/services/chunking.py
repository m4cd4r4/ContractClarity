"""Document chunking service."""

import re
from uuid import UUID
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.core.config import get_settings
from app.models.document import Chunk

settings = get_settings()


async def chunk_document(text: str, document_id: UUID) -> list[Chunk]:
    """
    Split document text into chunks suitable for embedding.

    Uses LangChain's RecursiveCharacterTextSplitter which tries to keep
    semantically related text together by splitting on paragraphs, then
    sentences, then words.

    Args:
        text: Full document text
        document_id: UUID of the parent document

    Returns:
        List of Chunk objects (not yet saved to database)
    """
    # Create splitter with contract-appropriate settings
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        separators=[
            "\n\n",  # Paragraph breaks
            "\n",    # Line breaks
            ". ",    # Sentences
            "; ",    # Clauses
            ", ",    # Phrases
            " ",     # Words
            "",      # Characters
        ],
        length_function=len,
    )

    # Split text into chunks
    text_chunks = splitter.split_text(text)

    # Create Chunk objects
    chunks = []
    for idx, chunk_text in enumerate(text_chunks):
        # Try to detect page number from text
        page_number = extract_page_number(chunk_text)

        chunk = Chunk(
            document_id=document_id,
            content=chunk_text,
            chunk_index=idx,
            page_number=page_number,
            chunk_metadata={
                "char_count": len(chunk_text),
                "word_count": len(chunk_text.split()),
            },
        )
        chunks.append(chunk)

    return chunks


def extract_page_number(text: str) -> int | None:
    """
    Try to extract page number from chunk text.

    Looks for page markers added during PDF extraction.
    """
    # Look for our page markers: "--- Page X ---"
    match = re.search(r"--- Page (\d+) ---", text)
    if match:
        return int(match.group(1))
    return None


async def chunk_for_clause_extraction(text: str) -> list[str]:
    """
    Create larger chunks suitable for clause extraction.

    Clause extraction needs more context, so we use larger chunks
    with more overlap.
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=2000,  # Larger for more context
        chunk_overlap=500,
        separators=[
            "\n\n",
            "\n",
            ". ",
            " ",
        ],
    )

    return splitter.split_text(text)
