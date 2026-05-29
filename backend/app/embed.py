"""Embeddings via Voyage AI, plus simple word-based chunking."""
import voyageai

from app.config import get_settings

_client: voyageai.Client | None = None


def _get_client() -> voyageai.Client:
    global _client
    if _client is None:
        _client = voyageai.Client(api_key=get_settings().voyage_api_key)
    return _client


def embed(texts: list[str], input_type: str = "document") -> list[list[float]]:
    """Embed a batch. input_type is 'document' or 'query'."""
    if not texts:
        return []
    cfg = get_settings()
    out: list[list[float]] = []
    # Voyage caps batch size; chunk into groups of 96.
    for i in range(0, len(texts), 96):
        batch = texts[i : i + 96]
        result = _get_client().embed(batch, model=cfg.voyage_model, input_type=input_type)
        out.extend(result.embeddings)
    return out


def embed_query(text: str) -> list[float]:
    return embed([text], input_type="query")[0]


def chunk_text(text: str, target_words: int = 220, overlap: int = 30) -> list[str]:
    """Split into ~300-token chunks (≈220 words) with small overlap."""
    words = (text or "").split()
    if not words:
        return []
    chunks: list[str] = []
    step = max(1, target_words - overlap)
    for start in range(0, len(words), step):
        piece = " ".join(words[start : start + target_words])
        if piece.strip():
            chunks.append(piece)
        if start + target_words >= len(words):
            break
    return chunks
