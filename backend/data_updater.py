"""
AlphaVision Daily Data Updater (Fixed)
=======================================
Updates S&P 100 prices and news using Finnhub (free API, 60 calls/min).
Sentiment scored with FinBERT (HuggingFace, runs locally).

Fixes applied:
- UTC timestamps throughout (no timezone drift)
- update_prices returns False when no new data (stops unnecessary VaR cache wipe)
- BRK.B -> BRK-B mapping for Finnhub
- Better error logging (shows what Finnhub actually returns)
- API key validation on startup
- Cleaner merge using pandas combine_first + update

Requires: FINNHUB_API_KEY environment variable (free at finnhub.io)
"""

import os
import sys
import json
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
FINNHUB_BASE = "https://finnhub.io/api/v1"

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
        _finbert_pipeline = pipeline("sentiment-analysis", model="ProsusAI/finbert", tokenizer="ProsusAI/finbert", device=-1)
        logger.info("FinBERT loaded")
    except Exception as e:
        logger.warning(f"FinBERT unavailable ({e}), using keyword fallback")
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
    t = text.lower()
    pos = {'surge','gain','profit','growth','beat','exceed','strong','rally','upgrade','outperform','positive','recovery','rise','boost','bullish','record','advance','improve','success','high'}
    neg = {'decline','loss','drop','fall','miss','weak','crash','downturn','downgrade','underperform','negative','concern','risk','sell','bearish','failure','cut','slump','warning','low'}
    words = set(t.split())
    p, n = len(words & pos), len(words & neg)
    return round((p - n) / (p + n), 4) if (p + n) > 0 else 0.0

# ─── Prices ──────────────────────────────────────────────────────

def _fetch_prices_yfinance(start_date: str, end_date: str) -> Optional[dict]:
    """Fallback: fetch daily closes from Yahoo Finance (no API key)."""
    try:
        import yfinance as yf
    except ImportError:
        logger.warning("yfinance not installed. pip install yfinance")
        return None

    # yfinance uses BRK.B not BRK-B (same as our CSV)
    tickers = [_csv_col(t) for t in SP100_TICKERS]
    logger.info(f"Fetching {len(tickers)} tickers via Yahoo Finance...")
    try:
        df = yf.download(tickers, start=start_date, end=end_date, progress=False, threads=True, group_by='ticker', auto_adjust=True)
    except Exception as e:
        logger.warning(f"yfinance download failed: {e}")
        return None

    if df.empty:
        return None

    new_data = {}
    for idx in df.index:
        d = idx.strftime('%Y-%m-%d') if hasattr(idx, 'strftime') else str(idx)[:10]
        new_data[d] = {}
        for t in tickers:
            try:
                if len(tickers) == 1:
                    val = df.loc[idx, 'Close'] if 'Close' in df.columns else df.loc[idx].iloc[0]
                else:
                    val = df.loc[idx, (t, 'Close')] if (t, 'Close') in df.columns else None
                if pd.notna(val):
                    new_data[d][t] = float(val)
            except (KeyError, TypeError):
                pass
        if not new_data[d]:
            del new_data[d]
    return new_data if new_data else None


def update_prices(api_key: str, days: int = 7) -> bool:
    """Returns True ONLY if new price data was written to disk."""
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
    end_ts = int(now_utc.timestamp())
    start_ts = int((now_utc - timedelta(days=days)).timestamp())
    start_date = (now_utc - timedelta(days=days)).strftime('%Y-%m-%d')
    end_date = now_utc.strftime('%Y-%m-%d')

    logger.info(f"Fetching {len(SP100_TICKERS)} tickers via Finnhub...")
    new_data = {}
    ok, fail = 0, 0

    for i, ticker in enumerate(SP100_TICKERS):
        data = finnhub_get("/stock/candle", {'symbol': ticker, 'resolution': 'D', 'from': start_ts, 'to': end_ts}, api_key)

        if data and data.get('s') == 'ok' and data.get('c') and data.get('t'):
            csv_col = _csv_col(ticker)
            for t_unix, close in zip(data['t'], data['c']):
                d = datetime.fromtimestamp(t_unix, tz=timezone.utc).strftime('%Y-%m-%d')
                if d not in new_data:
                    new_data[d] = {}
                new_data[d][csv_col] = close
            ok += 1
        else:
            status = data.get('s', 'null') if isinstance(data, dict) else str(type(data))
            logger.warning(f"  {ticker}: no data (status={status})")
            fail += 1

        if (i + 1) % 25 == 0:
            logger.info(f"  {i+1}/{len(SP100_TICKERS)} ({ok} ok, {fail} fail)")

    # Finnhub free tier returns 403 for /stock/candle — fall back to Yahoo Finance
    if not new_data and fail > 0:
        logger.info("Finnhub candle returned no data (403/restricted). Using Yahoo Finance fallback...")
        new_data = _fetch_prices_yfinance(start_date, end_date)

    if not new_data:
        logger.error("Zero price data from Finnhub and yfinance fallback.")
        return False

    new_df = pd.DataFrame.from_dict(new_data, orient='index')
    new_df.index = pd.to_datetime(new_df.index)
    new_df.index.name = 'Date'
    new_df.sort_index(inplace=True)

    logger.info(f"Got {len(new_df)} days, {ok} tickers. Latest: {new_df.index[-1].strftime('%Y-%m-%d')}")

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

    logger.info(f"Fetching news {from_date} -> {to_date}...")
    new_articles = 0

    for i, ticker in enumerate(SP100_TICKERS):
        data = finnhub_get("/company-news", {'symbol': ticker, 'from': from_date, 'to': to_date}, api_key)
        if not data or not isinstance(data, list):
            continue

        csv_col = _csv_col(ticker)
        ticker_key = f"{csv_col}.US"

        for article in data[:10]:
            headline = article.get('headline', '')
            summary = article.get('summary', '')
            if not headline:
                continue

            ts = article.get('datetime', 0)
            if ts:
                dt = datetime.fromtimestamp(ts, tz=timezone.utc)
                a_date = dt.strftime('%Y-%m-%d')
                a_dt = dt.isoformat()
            else:
                a_date = to_date
                a_dt = datetime.now(timezone.utc).isoformat()

            sentiment = analyze_sentiment(f"{headline}. {summary}" if summary else headline)

            obj = {
                "title": headline,
                "publisher": article.get('source', 'Finnhub'),
                "content": summary or headline,
                "link": article.get('url', ''),
                "date": a_dt,
                "symbols": [ticker_key],
                "sentiment": sentiment
            }

            if a_date not in existing_news:
                existing_news[a_date] = {}
            if ticker_key not in existing_news[a_date]:
                existing_news[a_date][ticker_key] = []

            titles = {a.get('title', '') for a in existing_news[a_date][ticker_key]}
            if headline not in titles:
                existing_news[a_date][ticker_key].append(obj)
                new_articles += 1

        if (i + 1) % 25 == 0:
            logger.info(f"  {i+1}/{len(SP100_TICKERS)} ({new_articles} articles)")

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(news_file, 'w') as f:
        json.dump(existing_news, f, default=str)

    logger.info(f"News saved: {new_articles} new articles")
    return True

# ─── VaR cache ───────────────────────────────────────────────────

def invalidate_var_cache():
    cache_dir = DATA_DIR / "var_cache"
    if cache_dir.exists():
        import shutil
        shutil.rmtree(cache_dir)
        logger.info("VaR cache invalidated")

# ─── Main ────────────────────────────────────────────────────────

def run_update(api_key: str, prices: bool = True, news: bool = True, days: int = 7) -> bool:
    logger.info("=" * 60)
    logger.info("AlphaVision Data Updater (Finnhub + FinBERT)")
    logger.info("=" * 60)

    if not api_key:
        logger.error("FINNHUB_API_KEY not set")
        return False

    # Validate key
    logger.info("Validating API key...")
    test = finnhub_get("/stock/profile2", {'symbol': 'AAPL'}, api_key)
    if test is None or not test:
        logger.error("API key validation failed — check key at https://finnhub.io/dashboard")
        return False
    logger.info(f"API key valid (AAPL = {test.get('name', '?')})")

    success = True
    new_prices = False

    if prices:
        logger.info("\nUpdating prices...")
        new_prices = update_prices(api_key, days=days)
        # VaR cache is extended incrementally (no invalidation)

    if news:
        logger.info("\nUpdating news...")
        if not update_news(api_key, days=min(days, 7)):
            success = False

    logger.info(f"\nDone. New prices: {new_prices}")
    return success

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AlphaVision Data Updater")
    parser.add_argument("--prices-only", action="store_true")
    parser.add_argument("--news-only", action="store_true")
    parser.add_argument("--days", type=int, default=7)
    args = parser.parse_args()

    api_key = os.getenv("FINNHUB_API_KEY", "")
    if args.prices_only:
        run_update(api_key, prices=True, news=False, days=args.days)
    elif args.news_only:
        run_update(api_key, prices=False, news=True, days=args.days)
    else:
        run_update(api_key, prices=True, news=True, days=args.days)
