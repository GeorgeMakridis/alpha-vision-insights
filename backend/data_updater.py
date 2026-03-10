"""
AlphaVision Daily Data Updater
===============================
Updates S&P 100 prices and news using Finnhub (free API, 60 calls/min).
Sentiment scored with FinBERT (HuggingFace, runs locally).

Requires: FINNHUB_API_KEY environment variable (free at finnhub.io)

Usage:
    python data_updater.py                  # Update prices + news
    python data_updater.py --prices-only    # Prices only
    python data_updater.py --news-only      # News only
    python data_updater.py --days 30        # Backfill last 30 days
"""

import os
import sys
import json
import time
import argparse
import logging
from datetime import datetime, timedelta
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

SP100_TICKERS = [
    "AAPL", "ABBV", "ABT", "ACN", "ADBE", "AIG", "ALL", "AMGN", "AMT", "AMZN",
    "AVGO", "AXP", "BA", "BAC", "BK", "BKNG", "BLK", "BMY", "BRK.B", "C",
    "CAT", "CHTR", "CL", "CMCSA", "COF", "COP", "COST", "CRM", "CSCO", "CVS",
    "CVX", "DD", "DHR", "DIS", "DOW", "DUK", "EMR", "EXC", "F", "FDX",
    "GD", "GE", "GILD", "GM", "GOOGL", "GS", "HD", "HON", "IBM", "INTC",
    "JNJ", "JPM", "KHC", "KO", "LIN", "LLY", "LMT", "LOW", "MA", "MCD",
    "MDLZ", "MDT", "MET", "META", "MMM", "MO", "MRK", "MS", "MSFT", "NEE",
    "NFLX", "NKE", "NVDA", "ORCL", "PEP", "PFE", "PG", "PM", "PYPL", "QCOM",
    "RTX", "SBUX", "SLB", "SO", "SPG", "T", "TGT", "TMO", "TSLA", "TXN",
    "UNH", "UNP", "UPS", "USB", "V", "VZ", "WBA", "WFC", "WMT", "XOM"
]

# ─── Rate limiter ────────────────────────────────────────────────

_last_call_time = 0.0
CALL_INTERVAL = 1.1  # seconds between calls (safe for 60/min limit)

def _rate_limit():
    """Enforce Finnhub rate limit: max 60 calls/min."""
    global _last_call_time
    elapsed = time.time() - _last_call_time
    if elapsed < CALL_INTERVAL:
        time.sleep(CALL_INTERVAL - elapsed)
    _last_call_time = time.time()


def finnhub_get(endpoint: str, params: dict, api_key: str) -> Optional[dict]:
    """Make a rate-limited GET request to Finnhub."""
    _rate_limit()
    params['token'] = api_key
    try:
        resp = requests.get(f"{FINNHUB_BASE}{endpoint}", params=params, timeout=15)
        if resp.status_code == 429:
            logger.warning("Rate limited, waiting 30s...")
            time.sleep(30)
            resp = requests.get(f"{FINNHUB_BASE}{endpoint}", params=params, timeout=15)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        logger.warning(f"Finnhub request failed ({endpoint}): {e}")
        return None


# ─── FinBERT sentiment ───────────────────────────────────────────

_finbert_pipeline = None
_finbert_loaded = False

def _load_finbert():
    """Load FinBERT model from HuggingFace (cached after first download)."""
    global _finbert_pipeline, _finbert_loaded
    if _finbert_loaded:
        return _finbert_pipeline
    try:
        from transformers import pipeline
        logger.info("Loading FinBERT model (first time downloads ~400MB)...")
        _finbert_pipeline = pipeline(
            "sentiment-analysis",
            model="ProsusAI/finbert",
            tokenizer="ProsusAI/finbert",
            device=-1  # CPU
        )
        logger.info("✅ FinBERT loaded")
    except Exception as e:
        logger.warning(f"FinBERT not available ({e}). Using keyword fallback.")
        _finbert_pipeline = None
    _finbert_loaded = True
    return _finbert_pipeline


def analyze_sentiment(text: str) -> float:
    """
    Score sentiment of financial text.
    Uses FinBERT if available (much better for financial text), else keyword fallback.
    Returns float in [-1, 1].
    """
    if not text or len(text.strip()) < 5:
        return 0.0
    
    pipe = _load_finbert()
    if pipe is not None:
        try:
            # FinBERT returns: [{'label': 'positive'|'negative'|'neutral', 'score': float}]
            result = pipe(text[:512])[0]  # truncate to model max
            label = result['label']
            score = result['score']
            if label == 'positive':
                return round(score, 4)
            elif label == 'negative':
                return round(-score, 4)
            else:
                return 0.0
        except Exception:
            pass
    
    return _keyword_sentiment(text)


def _keyword_sentiment(text: str) -> float:
    """Simple keyword-based fallback."""
    t = text.lower()
    pos = {'surge', 'gain', 'profit', 'growth', 'beat', 'exceed', 'strong', 'rally',
           'upgrade', 'outperform', 'positive', 'recovery', 'rise', 'boost', 'bullish',
           'record', 'advance', 'improve', 'success', 'high'}
    neg = {'decline', 'loss', 'drop', 'fall', 'miss', 'weak', 'crash', 'downturn',
           'downgrade', 'underperform', 'negative', 'concern', 'risk', 'sell',
           'bearish', 'failure', 'cut', 'slump', 'warning', 'low'}
    words = set(t.split())
    p = len(words & pos)
    n = len(words & neg)
    total = p + n
    return round((p - n) / total, 4) if total > 0 else 0.0


# ─── Price updater ───────────────────────────────────────────────

def update_prices(api_key: str, days: int = 7) -> bool:
    """
    Fetch daily close prices from Finnhub for all S&P 100 tickers.
    Uses /stock/candle endpoint.
    """
    price_file = DATA_DIR / "sp100_daily_prices.csv"
    
    # Load existing data
    existing_df = None
    if price_file.exists():
        existing_df = pd.read_csv(price_file, parse_dates=['Date'], index_col='Date')
        last_date = existing_df.index.max()
        stale_days = (datetime.now() - last_date).days
        if stale_days <= 0:
            logger.info("Price data is already up to date")
            return True
        days = max(days, stale_days + 2)
        logger.info(f"Existing data up to {last_date.strftime('%Y-%m-%d')}, fetching last {days} days")
    
    end_ts = int(datetime.now().timestamp())
    start_ts = int((datetime.now() - timedelta(days=days)).timestamp())
    
    logger.info(f"Fetching prices for {len(SP100_TICKERS)} tickers...")
    new_data = {}
    success_count = 0
    
    for i, ticker in enumerate(SP100_TICKERS):
        # Finnhub uses '.' not '.' for BRK.B — some special handling
        finnhub_symbol = ticker.replace('.', '-')  # BRK.B -> BRK-B on some exchanges
        # Actually Finnhub uses the standard symbol
        finnhub_symbol = ticker
        
        data = finnhub_get("/stock/candle", {
            'symbol': finnhub_symbol,
            'resolution': 'D',
            'from': start_ts,
            'to': end_ts,
        }, api_key)
        
        if data and data.get('s') == 'ok' and data.get('c'):
            dates = [datetime.fromtimestamp(t).strftime('%Y-%m-%d') for t in data['t']]
            closes = data['c']
            for d, c in zip(dates, closes):
                if d not in new_data:
                    new_data[d] = {}
                new_data[d][ticker] = c
            success_count += 1
        else:
            logger.warning(f"  No data for {ticker}")
        
        if (i + 1) % 20 == 0:
            logger.info(f"  Progress: {i+1}/{len(SP100_TICKERS)}")
    
    if not new_data:
        logger.error("No price data fetched")
        return False
    
    # Build DataFrame from new data
    new_df = pd.DataFrame.from_dict(new_data, orient='index')
    new_df.index = pd.to_datetime(new_df.index)
    new_df.index.name = 'Date'
    new_df.sort_index(inplace=True)
    
    # Merge with existing
    if existing_df is not None:
        # Add any new columns
        for col in new_df.columns:
            if col not in existing_df.columns:
                existing_df[col] = np.nan
        # Update
        for date in new_df.index:
            for col in new_df.columns:
                val = new_df.loc[date, col]
                if pd.notna(val):
                    if date in existing_df.index:
                        existing_df.loc[date, col] = val
                    else:
                        if date not in existing_df.index:
                            existing_df.loc[date] = np.nan
                        existing_df.loc[date, col] = val
        existing_df.sort_index(inplace=True)
        existing_df = existing_df[~existing_df.index.duplicated(keep='last')]
        result_df = existing_df
    else:
        result_df = new_df
    
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    result_df.to_csv(price_file)
    logger.info(f"✅ Prices saved: {success_count} tickers, {len(result_df)} total rows → {price_file}")
    return True


# ─── News updater ────────────────────────────────────────────────

def update_news(api_key: str, days: int = 3) -> bool:
    """
    Fetch per-ticker company news from Finnhub and score with FinBERT.
    Uses /company-news endpoint.
    """
    news_file = DATA_DIR / "news_sentiment_updated.json"
    
    existing_news = {}
    if news_file.exists():
        try:
            with open(news_file, 'r') as f:
                existing_news = json.load(f)
            logger.info(f"Existing news: {len(existing_news)} dates")
        except Exception as e:
            logger.warning(f"Could not load existing news: {e}")
    
    from_date = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
    to_date = datetime.now().strftime('%Y-%m-%d')
    
    logger.info(f"Fetching news for {len(SP100_TICKERS)} tickers ({from_date} to {to_date})...")
    new_articles = 0
    
    for i, ticker in enumerate(SP100_TICKERS):
        data = finnhub_get("/company-news", {
            'symbol': ticker,
            'from': from_date,
            'to': to_date,
        }, api_key)
        
        if not data or not isinstance(data, list):
            continue
        
        for article in data[:10]:  # max 10 per ticker per fetch
            headline = article.get('headline', '')
            summary = article.get('summary', '')
            if not headline:
                continue
            
            # Parse date
            article_ts = article.get('datetime', 0)
            if article_ts:
                article_dt = datetime.fromtimestamp(article_ts)
                article_date = article_dt.strftime('%Y-%m-%d')
                article_datetime = article_dt.isoformat()
            else:
                article_date = to_date
                article_datetime = datetime.now().isoformat()
            
            # Score sentiment
            sentiment_text = f"{headline}. {summary}" if summary else headline
            sentiment = analyze_sentiment(sentiment_text)
            
            # Build article in existing format
            ticker_key = f"{ticker}.US"
            article_obj = {
                "title": headline,
                "publisher": article.get('source', 'Finnhub'),
                "content": summary or headline,
                "link": article.get('url', ''),
                "date": article_datetime,
                "symbols": [ticker_key],
                "sentiment": sentiment
            }
            
            # Insert into existing structure
            if article_date not in existing_news:
                existing_news[article_date] = {}
            if ticker_key not in existing_news[article_date]:
                existing_news[article_date][ticker_key] = []
            
            # Deduplicate by title
            titles = {a.get('title', '') for a in existing_news[article_date][ticker_key]}
            if headline not in titles:
                existing_news[article_date][ticker_key].append(article_obj)
                new_articles += 1
        
        if (i + 1) % 20 == 0:
            logger.info(f"  Progress: {i+1}/{len(SP100_TICKERS)} ({new_articles} new articles)")
    
    # Save
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(news_file, 'w') as f:
        json.dump(existing_news, f, default=str)
    
    logger.info(f"✅ News saved: {new_articles} new articles, {len(existing_news)} total dates → {news_file}")
    return True


# ─── VaR cache invalidation ─────────────────────────────────────

def invalidate_var_cache():
    """Remove old VaR cache so it recalculates with new price data."""
    cache_dir = DATA_DIR / "var_cache"
    if cache_dir.exists():
        import shutil
        shutil.rmtree(cache_dir)
        logger.info("🗑️  VaR cache invalidated (recalculates on next startup)")


# ─── Main ────────────────────────────────────────────────────────

def run_update(api_key: str, prices: bool = True, news: bool = True, days: int = 7) -> bool:
    """Run the full data update pipeline."""
    logger.info("=" * 60)
    logger.info("AlphaVision Data Updater (Finnhub + FinBERT)")
    logger.info("=" * 60)
    
    if not api_key:
        logger.error("❌ FINNHUB_API_KEY not set. Get a free key at https://finnhub.io")
        return False
    
    success = True
    
    if prices:
        logger.info("\n📊 Updating prices via Finnhub...")
        if update_prices(api_key, days=days):
            invalidate_var_cache()
        else:
            success = False
    
    if news:
        logger.info("\n📰 Updating news via Finnhub + FinBERT...")
        if not update_news(api_key, days=min(days, 7)):
            success = False
    
    if success:
        logger.info("\n✅ All updates completed")
    else:
        logger.warning("\n⚠️  Some updates failed")
    
    return success


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AlphaVision Data Updater")
    parser.add_argument("--prices-only", action="store_true")
    parser.add_argument("--news-only", action="store_true")
    parser.add_argument("--days", type=int, default=7, help="Days to backfill (default: 7)")
    args = parser.parse_args()
    
    api_key = os.getenv("FINNHUB_API_KEY", "")
    
    if args.prices_only:
        run_update(api_key, prices=True, news=False, days=args.days)
    elif args.news_only:
        run_update(api_key, prices=False, news=True, days=args.days)
    else:
        run_update(api_key, prices=True, news=True, days=args.days)
