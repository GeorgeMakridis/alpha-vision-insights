#!/bin/bash
set -e

DEEPVAR_RESULTS="/app/data/deepvar_results/deepvar_dashboard.csv"
DEEPVAR_EPOCHS="${DEEPVAR_EPOCHS:-200}"

echo "================================================"
echo "  AlphaVision Backend - Starting"
echo "================================================"

# ── 1. Run daily data update if Finnhub key is available ─────────
if [ -n "$FINNHUB_API_KEY" ]; then
    PRICE_FILE="/app/data/sp100_daily_prices.csv"
    if [ -f "$PRICE_FILE" ]; then
        # Check staleness: update if older than 1 day (Linux stat)
        LAST_MOD=$(stat -c %Y "$PRICE_FILE" 2>/dev/null || echo 0)
        NOW=$(date +%s)
        AGE=$(( (NOW - LAST_MOD) / 86400 ))
        if [ "$AGE" -ge 1 ]; then
            echo ""
            echo "📊 Price data is ${AGE} day(s) old. Updating via Finnhub..."
            python /app/data_updater.py --days 10 || echo "⚠️  Data update failed, continuing with existing data"
        else
            echo "✅ Price data is fresh"
        fi
    else
        echo ""
        echo "📊 No price data found — bootstrapping via Finnhub..."
        python /app/data_updater.py --days 30 || echo "⚠️  Bootstrap failed. Provide initial data in backend/data/"
    fi
else
    echo "ℹ️  FINNHUB_API_KEY not set. Daily updates disabled."
    echo "   Get a free key at https://finnhub.io"
fi

# ── 2. Check for DeepVaR pre-computed results ───────────────────────
if [ ! -f "$DEEPVAR_RESULTS" ]; then
    echo ""
    echo "🧠 DeepVaR results not found at $DEEPVAR_RESULTS"
    echo "   Training DeepAR model (this runs ONCE, results persist via volume)..."
    echo "   Epochs: $DEEPVAR_EPOCHS"
    echo ""
    
    python /app/compute_deepvar.py --epochs "$DEEPVAR_EPOCHS"
    
    if [ -f "$DEEPVAR_RESULTS" ]; then
        echo ""
        echo "✅ DeepVaR training complete. Results saved to volume."
    else
        echo ""
        echo "⚠️  DeepVaR training did not produce results. Dashboard will run without DeepVaR."
    fi
else
    ROWS=$(wc -l < "$DEEPVAR_RESULTS")
    echo "✅ DeepVaR results found: $DEEPVAR_RESULTS ($ROWS rows)"
fi

# ── 3. Invalidate old VaR cache if it lacks DeepVaR columns ────────
VAR_CACHE_DIR="/app/data/var_cache"
if [ -d "$VAR_CACHE_DIR" ]; then
    # Check a sample cache file for DeepVaR columns
    SAMPLE_FILE=$(find "$VAR_CACHE_DIR" -name "*.csv" -print -quit 2>/dev/null)
    if [ -n "$SAMPLE_FILE" ]; then
        if ! head -1 "$SAMPLE_FILE" | grep -q "deepVaR95"; then
            echo "🗑️  Old VaR cache detected (no DeepVaR columns). Removing..."
            rm -rf "$VAR_CACHE_DIR"
            echo "   Will recalculate with DeepVaR on startup."
        else
            echo "✅ VaR cache includes DeepVaR columns."
        fi
    fi
fi

echo ""
echo "🚀 Starting uvicorn..."
echo ""

exec uvicorn main:app --host 0.0.0.0 --port 8000
