"""
HTTP client for external XAI (explainability) service.

Sentiment scores remain from FinBERT in data_updater; this module fetches
word-level explanations and narrative insights on demand.
"""

from __future__ import annotations

import os
from typing import Any, Dict, List

import httpx

XAI_API_URL = os.getenv("XAI_API_URL", "").strip().rstrip("/")
XAI_API_KEY = os.getenv("XAI_API_KEY", "").strip()
XAI_API_PATH = os.getenv("XAI_API_PATH", "/analyze").strip()
XAI_API_TIMEOUT = float(os.getenv("XAI_API_TIMEOUT", "30"))
XAI_USE_MOCK = os.getenv("XAI_USE_MOCK", "").lower() in ("true", "1", "yes")


class XAIClientError(Exception):
    """Raised when the external XAI service fails or returns invalid data."""


def is_xai_configured() -> bool:
    return bool(XAI_API_URL)


def _headers() -> Dict[str, str]:
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if XAI_API_KEY:
        headers["Authorization"] = f"Bearer {XAI_API_KEY}"
    return headers


def _normalize_lime_words(raw: Any) -> List[Dict[str, Any]]:
    if not isinstance(raw, list):
        return []
    out: List[Dict[str, Any]] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        word = item.get("word") or item.get("token")
        if not word:
            continue
        lime_val = item.get("limeValue", item.get("lime_value", item.get("value", 0)))
        importance = item.get("importance", item.get("weight", 0.3))
        try:
            out.append(
                {
                    "word": str(word),
                    "limeValue": round(float(lime_val), 4),
                    "importance": round(float(importance), 2),
                }
            )
        except (TypeError, ValueError):
            continue
    return out


def _parse_response(payload: Dict[str, Any]) -> Dict[str, Any]:
    lime_raw = payload.get("limeWords") or payload.get("lime_words") or payload.get("words")
    insights = (
        payload.get("aiInsights")
        or payload.get("ai_insights")
        or payload.get("insights")
        or payload.get("explanation")
        or ""
    )
    return {
        "limeWords": _normalize_lime_words(lime_raw),
        "aiInsights": str(insights) if insights is not None else "",
    }


async def fetch_xai_explanation(
    title: str,
    content: str,
    sentiment: float,
) -> Dict[str, Any]:
    """
    Call external XAI API. Returns dict with limeWords and aiInsights.

    Raises XAIClientError if not configured (and mock disabled) or request fails.
    """
    if not is_xai_configured():
        if XAI_USE_MOCK:
            return _mock_explanation(content, sentiment)
        raise XAIClientError("XAI_API_URL is not configured")

    path = XAI_API_PATH if XAI_API_PATH.startswith("/") else f"/{XAI_API_PATH}"
    url = f"{XAI_API_URL}{path}"
    body = {"title": title, "content": content, "sentiment": sentiment}

    try:
        async with httpx.AsyncClient(timeout=XAI_API_TIMEOUT) as client:
            response = await client.post(url, json=body, headers=_headers())
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPStatusError as e:
        raise XAIClientError(
            f"XAI service returned HTTP {e.response.status_code}"
        ) from e
    except httpx.RequestError as e:
        raise XAIClientError(f"XAI service request failed: {e}") from e
    except ValueError as e:
        raise XAIClientError("XAI service returned invalid JSON") from e

    if not isinstance(data, dict):
        raise XAIClientError("XAI service response must be a JSON object")

    parsed = _parse_response(data)
    if not parsed["limeWords"] and not parsed["aiInsights"]:
        raise XAIClientError("XAI service returned empty explanation")
    return parsed


def _mock_explanation(content: str, sentiment: float) -> Dict[str, Any]:
    """Dev-only fallback when XAI_USE_MOCK=true and no XAI_API_URL."""
    words = content.lower().split()
    positive = {"strong", "growth", "positive", "increase", "profit", "gain", "up"}
    negative = {"decline", "loss", "negative", "decrease", "concern", "risk", "down"}
    lime_words: List[Dict[str, Any]] = []
    for word in words[:40]:
        clean = word.strip(".,!?;:")
        if len(clean) < 3:
            continue
        if clean in positive:
            lv = 0.1 + sentiment * 0.1
        elif clean in negative:
            lv = -0.1 - sentiment * 0.1
        else:
            lv = sentiment * 0.05
        lime_words.append(
            {"word": clean, "limeValue": round(lv, 3), "importance": 0.5}
        )
    return {
        "limeWords": lime_words[:25],
        "aiInsights": (
            "Mock XAI (XAI_USE_MOCK=true). Configure XAI_API_URL for production explanations."
        ),
    }
