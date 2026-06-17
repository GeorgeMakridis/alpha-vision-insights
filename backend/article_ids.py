"""
Stable article identifiers for news lookup (matches frontend AssetNewsHeadlines logic).
"""

from __future__ import annotations

import re
from typing import Any, Dict, Optional


def compute_article_id(title: str, link: str = "", date_str: str = "") -> str:
    """Derive a stable id from URL slug or title+date (max 50 chars)."""
    if link:
        last_part = link.rstrip("/").split("/")[-1]
        if last_part:
            return re.sub(r"[^a-zA-Z0-9]", "_", last_part)[:50]
    combined = (title or "") + (date_str or "")
    return re.sub(r"[^a-zA-Z0-9]", "_", combined)[:50]


def article_storage_id(article: Dict[str, Any]) -> str:
    """Prefer stored article_id; otherwise compute from fields."""
    stored = article.get("article_id")
    if stored:
        return str(stored)
    title = article.get("title", "")
    link = article.get("link") or article.get("url") or ""
    date_val = article.get("date", "")
    if isinstance(date_val, str) and "T" in date_val:
        date_str = date_val.split("T")[0]
    else:
        date_str = str(date_val)[:10] if date_val else ""
    return compute_article_id(title, link, date_str)


def find_article_in_news_data(
    news_data: Dict[str, Any],
    article_id: str,
    url: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Scan loaded news JSON for an article matching article_id or url."""
    if not news_data or not article_id:
        return None

    article_id_norm = article_id.strip()
    url_norm = (url or "").strip()

    for _bucket, stocks_news in news_data.items():
        if not isinstance(stocks_news, dict):
            continue
        for _ticker, articles in stocks_news.items():
            if not isinstance(articles, list):
                continue
            for article in articles:
                if not isinstance(article, dict):
                    continue
                aid = article_storage_id(article)
                if aid == article_id_norm:
                    return article
                link = article.get("link") or article.get("url") or ""
                if url_norm and link and url_norm in link:
                    return article
                if url_norm and link.rstrip("/").endswith(url_norm.rstrip("/")):
                    return article
    return None
