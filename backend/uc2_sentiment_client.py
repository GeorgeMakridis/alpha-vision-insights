"""
Optional client for the UC2 federated sentiment HTTP service.

When UC2_SENTIMENT_URL is unset or the service is unavailable, callers get
empty scores and AlphaVision continues with FinBERT-only sentiment.
"""
from __future__ import annotations

import hashlib
import logging
import os
from typing import Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

UC2_SENTIMENT_URL = (os.getenv("UC2_SENTIMENT_URL") or "").strip().rstrip("/")
UC2_SENTIMENT_TIMEOUT = float(os.getenv("UC2_SENTIMENT_TIMEOUT", "30"))
UC2_SENTIMENT_ENABLED = os.getenv("UC2_SENTIMENT_ENABLED", "true").lower() in (
    "1",
    "true",
    "yes",
)

# Process-local cache: text hash -> score
_score_cache: Dict[str, float] = {}


def is_uc2_sentiment_configured() -> bool:
    return bool(UC2_SENTIMENT_URL) and UC2_SENTIMENT_ENABLED


def _text_key(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8", errors="ignore")).hexdigest()


async def uc2_sentiment_available() -> bool:
    if not is_uc2_sentiment_configured():
        return False
    try:
        async with httpx.AsyncClient(timeout=min(5.0, UC2_SENTIMENT_TIMEOUT)) as client:
            response = await client.get(f"{UC2_SENTIMENT_URL}/health")
            if response.status_code != 200:
                return False
            data = response.json()
            return bool(data.get("available"))
    except Exception as exc:
        logger.debug("UC2 sentiment health check failed: %s", exc)
        return False


async def score_texts(texts: List[str]) -> List[Optional[float]]:
    """
    Return one score in [-1, 1] per text (same order), or None when unavailable.
    Uses cache; batches uncached texts in one HTTP call.
    """
    if not texts or not is_uc2_sentiment_configured():
        return [None] * len(texts)

    out: List[Optional[float]] = [None] * len(texts)
    pending_idx: List[int] = []
    pending_texts: List[str] = []

    for i, text in enumerate(texts):
        cleaned = (text or "").strip()
        if not cleaned:
            out[i] = None
            continue
        key = _text_key(cleaned)
        if key in _score_cache:
            out[i] = _score_cache[key]
        else:
            pending_idx.append(i)
            pending_texts.append(cleaned)

    if not pending_texts:
        return out

    chunk_size = 64
    try:
        async with httpx.AsyncClient(timeout=UC2_SENTIMENT_TIMEOUT) as client:
            for start in range(0, len(pending_texts), chunk_size):
                chunk_texts = pending_texts[start : start + chunk_size]
                chunk_idx = pending_idx[start : start + chunk_size]
                response = await client.post(
                    f"{UC2_SENTIMENT_URL}/predict",
                    json={"texts": chunk_texts},
                )
                if response.status_code == 503:
                    logger.info("UC2 sentiment service not ready (503)")
                    return out
                response.raise_for_status()
                results = (response.json().get("results") or [])
                if len(results) != len(chunk_texts):
                    logger.warning(
                        "UC2 sentiment result length mismatch: %s vs %s",
                        len(results),
                        len(chunk_texts),
                    )
                    continue
                for pos, (idx, result) in enumerate(zip(chunk_idx, results)):
                    try:
                        score = float(result["score"])
                    except (KeyError, TypeError, ValueError):
                        continue
                    score = max(-1.0, min(1.0, score))
                    _score_cache[_text_key(chunk_texts[pos])] = score
                    out[idx] = score
    except Exception as exc:
        logger.warning("UC2 sentiment request failed: %s", exc)

    return out


def _article_text(article: dict) -> str:
    title = (article.get("title") or "").strip()
    content = (article.get("content") or "").strip()
    return content or title


async def mean_score_for_articles(articles: List[dict]) -> Optional[float]:
    """Average UC2 score over article titles/content; None if none scored."""
    if not articles:
        return None
    texts = [_article_text(a) for a in articles]
    scores = await score_texts(texts)
    valid = [s for s in scores if s is not None]
    if not valid:
        return None
    return float(sum(valid) / len(valid))


async def mean_scores_for_article_groups(
    groups: List[Optional[List[dict]]],
) -> List[Optional[float]]:
    """
    Average UC2 score per day/group. Batches all headlines into one HTTP call.
    ``groups[i]`` is the article list for day i (or None).
    """
    if not groups or not is_uc2_sentiment_configured():
        return [None] * len(groups)

    flat_texts: List[str] = []
    spans: List[tuple] = []  # (start, end) into flat_texts
    for articles in groups:
        if not articles:
            spans.append((-1, -1))
            continue
        start = len(flat_texts)
        for article in articles:
            flat_texts.append(_article_text(article))
        spans.append((start, len(flat_texts)))

    flat_scores = await score_texts(flat_texts) if flat_texts else []
    out: List[Optional[float]] = []
    for start, end in spans:
        if start < 0:
            out.append(None)
            continue
        valid = [s for s in flat_scores[start:end] if s is not None]
        out.append(float(sum(valid) / len(valid)) if valid else None)
    return out
