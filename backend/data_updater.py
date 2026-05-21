"""
AlphaVision Daily Data Updater (Fixed)
=======================================
Updates S&P 100 prices (Yahoo Finance) and news (Finnhub).
Sentiment scored with FinBERT (HuggingFace, runs locally).

- Prices: Yahoo Finance (free, no API key). Env: ``YFINANCE_DOWNLOAD_RETRIES``,
  ``YFINANCE_RETRY_BACKOFF_BASE_SEC``, ``YFINANCE_RETRY_BACKOFF_MAX_SEC``,
  ``YFINANCE_DOWNLOAD_THREADS`` (default sequential).
- News: Finnhub (requires FINNHUB_API_KEY at finnhub.io)
- Market cap: Finnhub ``/stock/profile2`` (primary) and Yahoo ``yfinance`` (fallback)
- Finnhub /stock/candle requires premium; we use Yahoo for prices only.
"""

import os
import sys
import json

# Load .env so FINNHUB_API_KEY is available when run standalone (not just via Docker)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass
import time
import argparse
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Optional

import pandas as pd
import numpy as np
import requests

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent / "data"
MARKET_CAPS_FILE = DATA_DIR / "market_caps.json"
FINNHUB_BASE = "https://finnhub.io/api/v1"

# Sanity bounds for USD market cap (avoid bad API data)
_MIN_MARKET_CAP_USD = 1e7
_MAX_MARKET_CAP_USD = 50e12

# Finnhub uses BRK-B not BRK.B
SP100_TICKERS = [
    "AAPL", "ABBV", "ABT", "ACN", "ADBE", "AIG", "ALL", "AMGN", "AMT", "AMZN",
    "AVGO", "AXP", "BA", "BAC", "BK", "BKNG", "BLK", "BMY", "BRK-B", "C",
    "CAT", "CHTR", "CL", "CMCSA", "COF", "COP", "COST", "CRM", "CSCO", "CVS",
    "CVX", "DD", "DHR", "DIS", "DOW", "DUK", "EMR", "EXC", "F", "FDX",
    "GD", "GE", "GILD", "GM", "GOOGL", "GS", "HD", "HON", "IBM", "INTC",
    "JNJ", "JPM", "KHC", "KO", "LIN", "LLY", "LMT", "LOW", "MA", "MCD",
    "MDLZ", "MDT", "MET", "META", "MMM", "MO", "MRK", "MS", "MSFT", "NEE",
    "NFLX", "NKE", "NVDA", "ORCL", "PEP", "PFE", "PG", "PM", "PYPL", "QCOM",
    "RTX", "SBUX", "SLB", "SO", "SPG", "T", "TGT", "TMO", "TSLA", "TXN",
    "UNH", "UNP", "UPS", "USB", "V", "VZ", "WBA", "WFC", "WMT", "XOM"
]

# Finnhub symbol <-> CSV column mapping (only for tickers that differ)
_FINNHUB_TO_CSV = {"BRK-B": "BRK.B"}

def _csv_col(finnhub_sym: str) -> str:
    return _FINNHUB_TO_CSV.get(finnhub_sym, finnhub_sym)


def _yahoo_symbol(csv_ticker: str) -> str:
    """yfinance uses BRK-B for Berkshire, same as Finnhub."""
    if csv_ticker == "BRK.B":
        return "BRK-B"
    return csv_ticker


def _sanitize_market_cap(value: Optional[float]) -> Optional[float]:
    """Return USD float or None if out of range."""
    if value is None:
        return None
    try:
        v = float(value)
    except (TypeError, ValueError):
        return None
    if v < _MIN_MARKET_CAP_USD or v > _MAX_MARKET_CAP_USD:
        return None
    return v


def _fetch_market_cap_finnhub(finnhub_sym: str, api_key: str) -> Optional[float]:
    """
    Finnhub /stock/profile2 returns marketCapitalization in millions USD.
    See https://finnhub.io/docs/api/stock-profile
    """
    if not api_key:
        return None
    prof = finnhub_get("/stock/profile2", {"symbol": finnhub_sym}, api_key)
    if not prof or not isinstance(prof, dict):
        return None
    mc = prof.get("marketCapitalization")
    if mc is None:
        return None
    try:
        millions = float(mc)
    except (TypeError, ValueError):
        return None
    if millions <= 0:
        return None
    usd = millions * 1_000_000.0
    return _sanitize_market_cap(usd)


def _fetch_market_cap_yahoo(csv_ticker: str) -> Optional[float]:
    """Yahoo Finance via yfinance; values are USD when present."""
    try:
        import yfinance as yf
    except ImportError:
        logger.warning("yfinance not installed; cannot fetch Yahoo market cap")
        return None
    sym = _yahoo_symbol(csv_ticker)
    try:
        t = yf.Ticker(sym)
        fast = getattr(t, "fast_info", None)
        if fast is not None:
            mc = fast.get("market_cap") or fast.get("marketCap")
            cap = _sanitize_market_cap(
                float(mc) if mc is not None else None
            )
            if cap is not None:
                return cap
        info = getattr(t, "info", None) or {}
        if isinstance(info, dict):
            mc2 = info.get("marketCap") or info.get("market_cap")
            cap2 = _sanitize_market_cap(
                float(mc2) if mc2 is not None else None
            )
            if cap2 is not None:
                return cap2
    except Exception as e:
        logger.warning(f"yfinance market cap failed for {sym}: {e}")
    return None

# ─── Rate limiter ────────────────────────────────────────────────

_last_call_time = 0.0
CALL_INTERVAL = 1.1

def _rate_limit():
    global _last_call_time
    elapsed = time.time() - _last_call_time
    if elapsed < CALL_INTERVAL:
        time.sleep(CALL_INTERVAL - elapsed)
    _last_call_time = time.time()

def finnhub_get(endpoint: str, params: dict, api_key: str) -> Optional[dict]:
    _rate_limit()
    params['token'] = api_key
    try:
        resp = requests.get(f"{FINNHUB_BASE}{endpoint}", params=params, timeout=15)
        if resp.status_code == 429:
            logger.warning("Rate limited, waiting 60s...")
            time.sleep(60)
            resp = requests.get(f"{FINNHUB_BASE}{endpoint}", params=params, timeout=15)
        if resp.status_code == 401:
            logger.error("Finnhub 401 — invalid API key")
            return None
        if resp.status_code == 403:
            logger.error(f"Finnhub 403 — endpoint {endpoint} may require premium")
            return None
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        logger.warning(f"Finnhub {endpoint} failed: {e}")
        return None

# ─── FinBERT ─────────────────────────────────────────────────────

_finbert_pipeline = None
_finbert_loaded = False

def _load_finbert():
    global _finbert_pipeline, _finbert_loaded
    if _finbert_loaded:
        return _finbert_pipeline
    try:
        from transformers import pipeline
        logger.info("Loading FinBERT model (~400MB first time)...")
        _finbert_pipeline = pipeline(
            "sentiment-analysis",
            model="ProsusAI/finbert",
            tokenizer="ProsusAI/finbert",
            device=-1,
        )
        logger.info("FinBERT loaded successfully — using for sentiment analysis")
    except Exception as e:
        logger.warning(
            f"FinBERT unavailable ({e}), using keyword fallback. "
            "Install: pip install transformers torch"
        )
        _finbert_pipeline = None
    _finbert_loaded = True
    return _finbert_pipeline

def analyze_sentiment(text: str) -> float:
    if not text or len(text.strip()) < 5:
        return 0.0
    pipe = _load_finbert()
    if pipe is not None:
        try:
            r = pipe(text[:512])[0]
            if r['label'] == 'positive': return round(r['score'], 4)
            elif r['label'] == 'negative': return round(-r['score'], 4)
            else: return 0.0
        except Exception:
            pass
    return _keyword_sentiment(text)

def _keyword_sentiment(text: str) -> float:
    """Fallback when FinBERT unavailable. Expanded financial keyword lists."""
    t = text.lower()
    pos = {
        'surge', 'gain', 'profit', 'growth', 'beat', 'exceed', 'strong', 'rally',
        'upgrade', 'outperform', 'positive', 'recovery', 'rise', 'boost', 'bullish',
        'record', 'advance', 'improve', 'success', 'high', 'soar', 'jump', 'climb',
        'optimistic', 'buy', 'outperform', 'bull', 'earnings beat', 'revenue growth',
        'dividend increase', 'expansion', 'acquisition', 'partnership', 'breakthrough'
    }
    neg = {
        'decline', 'loss', 'drop', 'fall', 'miss', 'weak', 'crash', 'downturn',
        'downgrade', 'underperform', 'negative', 'concern', 'risk', 'sell', 'bearish',
        'failure', 'cut', 'slump', 'warning', 'low', 'plunge', 'tumble', 'layoff',
        'bankruptcy', 'lawsuit', 'fraud', 'investigation', 'recall', 'recession',
        'earnings miss', 'revenue decline', 'dividend cut', 'downgrade', 'bear'
    }
    words = set(t.split())
    p, n = len(words & pos), len(words & neg)
    return round((p - n) / (p + n), 4) if (p + n) > 0 else 0.0

# ─── Prices ──────────────────────────────────────────────────────

def _fetch_prices_yfinance(start_date: str, end_date: str) -> Optional[dict]:
    """Fetch daily closes from Yahoo Finance (no API key).

    Retries with exponential backoff: Docker / corporate networks often fail
    transiently to fc.yahoo.com; Finnhub news can still succeed in those cases.
    """
    try:
        import yfinance as yf
    except ImportError:
        logger.warning("yfinance not installed. pip install yfinance")
        return None

    # yfinance uses BRK.B not BRK-B (same as our CSV)
    tickers = [_csv_col(t) for t in SP100_TICKERS]
    max_retries = max(1, int(os.getenv("YFINANCE_DOWNLOAD_RETRIES", "5")))
    backoff_cap = float(os.getenv("YFINANCE_RETRY_BACKOFF_MAX_SEC", "60"))
    base_sleep = float(os.getenv("YFINANCE_RETRY_BACKOFF_BASE_SEC", "3"))
    # Sequential downloads hit Yahoo less aggressively than threads=True
    use_threads = os.getenv("YFINANCE_DOWNLOAD_THREADS", "false").lower() in (
        "1", "true", "yes",
    )

    logger.info(
        f"Fetching {len(tickers)} tickers via Yahoo Finance "
        f"(retries={max_retries}, threads={use_threads})..."
    )

    last_error: Optional[Exception] = None
    for attempt in range(max_retries):
        try:
            df = yf.download(
                tickers,
                start=start_date,
                end=end_date,
                progress=False,
                threads=use_threads,
                group_by="ticker",
                auto_adjust=True,
            )
        except Exception as e:
            last_error = e
            logger.warning(
                "yfinance download attempt %s/%s failed: %s",
                attempt + 1,
                max_retries,
                e,
            )
            df = None

        if df is not None and df.empty:
            logger.warning(
                "yfinance returned empty dataframe (attempt %s/%s)",
                attempt + 1,
                max_retries,
            )
        if df is not None and not df.empty:
            new_data: Dict[str, Dict[str, float]] = {}
            for idx in df.index:
                d = idx.strftime("%Y-%m-%d") if hasattr(idx, "strftime") else str(idx)[:10]
                new_data[d] = {}
                for t in tickers:
                    try:
                        if len(tickers) == 1:
                            val = (
                                df.loc[idx, "Close"]
                                if "Close" in df.columns
                                else df.loc[idx].iloc[0]
                            )
                        else:
                            val = (
                                df.loc[idx, (t, "Close")]
                                if (t, "Close") in df.columns
                                else None
                            )
                        if pd.notna(val):
                            new_data[d][t] = float(val)
                    except (KeyError, TypeError):
                        pass
                if not new_data[d]:
                    del new_data[d]
            if new_data:
                if attempt > 0:
                    logger.info("Yahoo Finance price download succeeded on retry")
                return new_data

        if attempt < max_retries - 1:
            sleep_sec = min(base_sleep * (2**attempt), backoff_cap)
            logger.info("Retrying Yahoo Finance download in %.0fs...", sleep_sec)
            time.sleep(sleep_sec)

    if last_error:
        logger.error(
            "Yahoo Finance price download failed after %s attempts: %s",
            max_retries,
            last_error,
        )
    return None


def update_prices(api_key: str = "", days: int = 7) -> bool:
    """Returns True ONLY if new price data was written to disk.
    Uses Yahoo Finance for prices (no API key). Finnhub is used only for news."""
    price_file = DATA_DIR / "sp100_daily_prices.csv"

    existing_df = None
    last_date = None
    if price_file.exists():
        existing_df = pd.read_csv(price_file, parse_dates=['Date'], index_col='Date')
        last_date = existing_df.index.max()
        today = pd.Timestamp(datetime.now().date())
        stale_days = (today - last_date).days
        if stale_days <= 0:
            logger.info(f"Prices already current (latest: {last_date.strftime('%Y-%m-%d')})")
            return False
        days = max(days, stale_days + 5)
        logger.info(f"Prices end at {last_date.strftime('%Y-%m-%d')} ({stale_days}d stale), fetching {days}d")

    now_utc = datetime.now(timezone.utc)
    start_date = (now_utc - timedelta(days=days)).strftime('%Y-%m-%d')
    end_date = now_utc.strftime('%Y-%m-%d')

    # Yahoo Finance for prices (free, no API key). Finnhub /stock/candle requires premium.
    new_data = _fetch_prices_yfinance(start_date, end_date)

    if not new_data:
        logger.error("Zero price data from Yahoo Finance.")
        return False

    new_df = pd.DataFrame.from_dict(new_data, orient='index')
    new_df.index = pd.to_datetime(new_df.index)
    new_df.index.name = 'Date'
    new_df.sort_index(inplace=True)

    ticker_count = sum(1 for c in new_df.columns if new_df[c].notna().any())
    logger.info(f"Got {len(new_df)} days, {ticker_count} tickers. Latest: {new_df.index[-1].strftime('%Y-%m-%d')}")

    if existing_df is not None:
        combined = existing_df.combine_first(new_df)
        combined.update(new_df)
        combined.sort_index(inplace=True)
        combined = combined[~combined.index.duplicated(keep='last')]
        result_df = combined
    else:
        result_df = new_df

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    result_df.to_csv(price_file)
    old_str = last_date.strftime('%Y-%m-%d') if last_date else 'N/A'
    new_str = result_df.index[-1].strftime('%Y-%m-%d')
    logger.info(f"Prices saved: {len(result_df)} rows. {old_str} -> {new_str}")
    return True

# ─── News ────────────────────────────────────────────────────────

def _fetch_news_yahoo(csv_ticker: str, limit: int = 10) -> List[dict]:
    """
    Fetch recent company news from Yahoo Finance as a fallback source.

    Returns a list of normalized article dicts that match the updater schema.
    """
    try:
        import yfinance as yf
    except ImportError:
        logger.warning("yfinance not installed; cannot fetch Yahoo fallback news")
        return []

    sym = _yahoo_symbol(csv_ticker)
    try:
        raw_news = getattr(yf.Ticker(sym), "news", None) or []
    except Exception as e:
        logger.warning(f"yfinance news failed for {sym}: {e}")
        return []

    out: List[dict] = []
    for item in raw_news[:limit]:
        if not isinstance(item, dict):
            continue
        title = (item.get("title") or "").strip()
        if not title:
            continue
        ts = item.get("providerPublishTime")
        if ts:
            dt = datetime.fromtimestamp(ts, tz=timezone.utc)
            a_dt = dt.isoformat()
        else:
            a_dt = datetime.now(timezone.utc).isoformat()
        summary = (
            item.get("summary")
            or item.get("description")
            or title
        )
        out.append(
            {
                "headline": title,
                "summary": summary,
                "datetime": ts or 0,
                "source": item.get("publisher", "Yahoo Finance"),
                "url": item.get("link") or item.get("url") or "",
                "iso_date": a_dt,
            }
        )
    return out


def _news_articles_cap(days: int) -> int:
    """More days requested => keep more articles per ticker (Finnhub can return many)."""
    if days >= 180:
        return 60
    if days >= 90:
        return 45
    if days >= 30:
        return 35
    if days >= 14:
        return 25
    return 10


def update_news(api_key: str, days: int = 3) -> bool:
    news_file = DATA_DIR / "news_sentiment_updated.json"

    existing_news = {}
    if news_file.exists():
        try:
            with open(news_file, 'r') as f:
                existing_news = json.load(f)
        except Exception as e:
            logger.warning(f"Could not load existing news: {e}")

    from_date = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
    to_date = datetime.now().strftime('%Y-%m-%d')

    cap = _news_articles_cap(days)
    logger.info(f"Fetching news {from_date} -> {to_date} (up to {cap} articles/ticker)...")
    new_articles = 0
    tickers_finnhub = 0
    tickers_yahoo = 0

    for i, ticker in enumerate(SP100_TICKERS):
        csv_col = _csv_col(ticker)
        ticker_key = f"{csv_col}.US"
        data = finnhub_get(
            "/company-news",
            {"symbol": ticker, "from": from_date, "to": to_date},
            api_key,
        )
        source_name = "finnhub"
        if not data or not isinstance(data, list):
            data = []

        if data:
            tickers_finnhub += 1
        else:
            # Provider fallback for sparse company-news coverage
            data = _fetch_news_yahoo(csv_col, limit=cap)
            source_name = "yahoo"
            if data:
                tickers_yahoo += 1

        added_for_ticker = 0
        for article in data[:cap]:
            headline = article.get("headline", "")
            summary = article.get("summary", "")
            if not headline:
                continue

            ts = article.get("datetime", 0)
            if ts:
                dt = datetime.fromtimestamp(ts, tz=timezone.utc)
                a_date = dt.strftime("%Y-%m-%d")
                a_dt = dt.isoformat()
            else:
                a_date = to_date
                a_dt = article.get("iso_date", datetime.now(timezone.utc).isoformat())

            # Keep date window strict for both sources
            if a_date < from_date or a_date > to_date:
                continue

            sentiment = analyze_sentiment(f"{headline}. {summary}" if summary else headline)

            obj = {
                "title": headline,
                "publisher": article.get("source", "Finnhub"),
                "content": summary or headline,
                "link": article.get("url", ""),
                "date": a_dt,
                "symbols": [ticker_key],
                "sentiment": sentiment,
            }

            if a_date not in existing_news:
                existing_news[a_date] = {}
            if ticker_key not in existing_news[a_date]:
                existing_news[a_date][ticker_key] = []

            titles = {a.get('title', '') for a in existing_news[a_date][ticker_key]}
            if headline not in titles:
                existing_news[a_date][ticker_key].append(obj)
                new_articles += 1
                added_for_ticker += 1

        if source_name == "yahoo" and added_for_ticker:
            logger.debug(f"Yahoo fallback added {added_for_ticker} items for {csv_col}")

        if (i + 1) % 25 == 0:
            logger.info(f"  {i+1}/{len(SP100_TICKERS)} ({new_articles} articles)")

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(news_file, 'w') as f:
        json.dump(existing_news, f, default=str)

    logger.info(
        f"News saved: {new_articles} new articles "
        f"(finnhub_tickers={tickers_finnhub}, yahoo_fallback_tickers={tickers_yahoo})"
    )
    return True


def update_market_caps(api_key: str = "") -> bool:
    """
    Fetch market capitalization for S&P 100 names (CSV column keys).

    Primary: Finnhub /stock/profile2 (requires FINNHUB_API_KEY).
    Fallback: Yahoo Finance (yfinance), no key.

    Persists ``backend/data/market_caps.json`` with per-ticker USD values
    and source metadata.
    """
    logger.info("Fetching market caps (Finnhub primary, Yahoo fallback)...")
    now_iso = datetime.now(timezone.utc).isoformat()
    tickers_out: Dict[str, Dict[str, object]] = {}
    n_finnhub = 0
    n_yahoo = 0
    n_missing = 0

    for i, finnhub_sym in enumerate(SP100_TICKERS):
        csv_key = _csv_col(finnhub_sym)
        cap: Optional[float] = None
        source = "none"

        if api_key:
            cap = _fetch_market_cap_finnhub(finnhub_sym, api_key)
            if cap is not None:
                source = "finnhub"
                n_finnhub += 1

        if cap is None:
            cap = _fetch_market_cap_yahoo(csv_key)
            if cap is not None:
                source = "yahoo"
                n_yahoo += 1

        if cap is None:
            n_missing += 1
            logger.debug(f"No market cap for {csv_key} ({finnhub_sym})")
        else:
            tickers_out[csv_key] = {
                "marketCap": cap,
                "source": source,
                "asOf": now_iso,
            }

        if (i + 1) % 25 == 0:
            logger.info(
                f"  market caps {i + 1}/{len(SP100_TICKERS)} "
                f"(finnhub={n_finnhub}, yahoo={n_yahoo}, missing={n_missing})"
            )

    payload = {
        "updated_at": now_iso,
        "tickers": tickers_out,
    }
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(MARKET_CAPS_FILE, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=0, default=str)

    filled = n_finnhub + n_yahoo
    pct = 100.0 * filled / len(SP100_TICKERS) if SP100_TICKERS else 0.0
    logger.info(
        f"Market caps saved: {filled}/{len(SP100_TICKERS)} tickers "
        f"({pct:.1f}% coverage); finnhub={n_finnhub}, yahoo={n_yahoo}, "
        f"missing={n_missing}"
    )
    return True


def refresh_sentiment() -> bool:
    """
    Re-process ALL existing news articles with FinBERT to update sentiment scores.
    Use when articles were saved with 0 sentiment (e.g. keyword fallback failed).
    """
    news_file = DATA_DIR / "news_sentiment_updated.json"
    if not news_file.exists():
        logger.error("No news file found")
        return False

    with open(news_file, "r") as f:
        existing_news = json.load(f)

    logger.info("Re-processing all articles with FinBERT for sentiment...")
    pipe = _load_finbert()
    if pipe is None:
        logger.error("FinBERT not available. Cannot refresh sentiment.")
        return False

    updated = 0
    total = 0
    for a_date in existing_news:
        for ticker_key in existing_news[a_date]:
            for article in existing_news[a_date][ticker_key]:
                total += 1
                text = f"{article.get('title', '')}. {article.get('content', '')}"
                new_sentiment = analyze_sentiment(text)
                if article.get("sentiment") != new_sentiment:
                    article["sentiment"] = new_sentiment
                    updated += 1
                if total % 100 == 0:
                    logger.info(f"  Processed {total} articles ({updated} updated)")

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(news_file, "w") as f:
        json.dump(existing_news, f, default=str)

    logger.info(f"Sentiment refresh complete: {updated}/{total} articles updated")
    return True


# ─── VaR cache ───────────────────────────────────────────────────

def invalidate_var_cache():
    cache_dir = DATA_DIR / "var_cache"
    if cache_dir.exists():
        import shutil
        shutil.rmtree(cache_dir)
        logger.info("VaR cache invalidated")

# ─── Main ────────────────────────────────────────────────────────

def run_update(
    api_key: str,
    prices: bool = True,
    news: bool = True,
    days: int = 7,
    market_caps: bool = True,
) -> bool:
    logger.info("=" * 60)
    logger.info("AlphaVision Data Updater (Yahoo Finance + Finnhub + FinBERT)")
    logger.info("=" * 60)

    # Validate Finnhub key only when fetching news
    if news:
        if not api_key:
            logger.error("FINNHUB_API_KEY not set (required for news)")
            return False
        logger.info("Validating Finnhub API key...")
        test = finnhub_get("/stock/profile2", {'symbol': 'AAPL'}, api_key)
        if test is None or not test:
            logger.error("API key validation failed — check key at https://finnhub.io/dashboard")
            return False
        logger.info(f"Finnhub key valid (AAPL = {test.get('name', '?')})")

    success = True
    new_prices = False

    if prices:
        logger.info("\nUpdating prices (Yahoo Finance)...")
        new_prices = update_prices(days=days)
        # VaR cache is extended incrementally (no invalidation)

    if news:
        logger.info("\nUpdating news (Finnhub)...")
        if not update_news(api_key, days=days):
            success = False

    if market_caps:
        logger.info("\nUpdating market caps...")
        try:
            update_market_caps(api_key or "")
        except Exception as e:
            logger.warning(f"Market cap update failed (non-fatal): {e}")

    logger.info(f"\nDone. New prices: {new_prices}")
    return success

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AlphaVision Data Updater")
    parser.add_argument("--prices-only", action="store_true")
    parser.add_argument("--news-only", action="store_true")
    parser.add_argument(
        "--market-cap-only",
        action="store_true",
        help="Fetch and save market caps only (Finnhub + Yahoo fallback)",
    )
    parser.add_argument("--refresh-sentiment", action="store_true",
                        help="Re-process all existing news with FinBERT to update sentiment scores")
    parser.add_argument("--days", type=int, default=7)
    args = parser.parse_args()

    api_key = os.getenv("FINNHUB_API_KEY", "")

    if args.refresh_sentiment:
        logger.info("=" * 60)
        logger.info("AlphaVision Sentiment Refresh (FinBERT)")
        logger.info("=" * 60)
        refresh_sentiment()
    elif args.market_cap_only:
        logger.info("=" * 60)
        logger.info("AlphaVision Market Cap Update")
        logger.info("=" * 60)
        update_market_caps(api_key or "")
    elif args.prices_only:
        run_update(api_key, prices=True, news=False, days=args.days)
    elif args.news_only:
        run_update(api_key, prices=False, news=True, days=args.days)
    else:
        run_update(api_key, prices=True, news=True, days=args.days)
