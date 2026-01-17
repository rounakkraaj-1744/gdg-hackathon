import re
from typing import List


def clean_text(text: str) -> str:
    """
    Basic cleanup for raw web-extracted text.
    - Removes excessive newlines
    - Normalizes whitespace
    - Strips leading/trailing spaces
    """
    # Normalize line breaks
    text = re.sub(r'\r\n', '\n', text)
    text = re.sub(r'\n{3,}', '\n\n', text)

    # Remove excessive spaces
    text = re.sub(r'[ \t]{2,}', ' ', text)

    return text.strip()


def split_into_paragraphs(text: str) -> List[str]:
    """
    Splits text into paragraphs using double newlines.
    Filters out very short or useless paragraphs.
    """
    paragraphs = text.split("\n\n")

    cleaned = []
    for p in paragraphs:
        p = p.strip()
        # Ignore very short lines (noise)
        if len(p) < 40:
            continue
        cleaned.append(p)

    return cleaned


def chunk_text(text: str, max_chars: int = 2000) -> List[str]:
    """
    Splits long text into chunks of approximately max_chars.
    Tries to respect paragraph boundaries.
    """

    text = clean_text(text)
    paragraphs = split_into_paragraphs(text)

    chunks = []
    current_chunk = ""

    for para in paragraphs:
        # If adding this paragraph exceeds max_chars, finalize current chunk
        if len(current_chunk) + len(para) + 2 > max_chars:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = para
        else:
            if current_chunk:
                current_chunk += "\n\n" + para
            else:
                current_chunk = para

    if current_chunk:
        chunks.append(current_chunk.strip())

    return chunks
