#!/bin/bash
set -e

DEEPVAR_RESULTS="/app/data/deepvar_results/deepvar_dashboard.csv"
DEEPVAR_EPOCHS="${DEEPVAR_EPOCHS:-200}"

echo "================================================"
echo "  AlphaVision Backend - Starting"
echo "================================================"

# ── 1. Run data update if Finnhub key is set ─────────────────────
if [ -n "$FINNHUB_API_KEY" ]; then
    PRICE_FILE="/app/data/sp100_daily_prices.csv"
    if [ -f "$PRICE_FILE" ]; then
        echo ""
        echo "📊 Running data update check..."
        # The updater checks staleness and skips if already current.
        # VaR cache is extended incrementally (no invalidation).
        python /app/data_updater.py --days 10 || echo "⚠️  Data update failed, continuing with existing data"
    else
        echo ""
        echo "📊 No price data found — bootstrapping..."
        python /app/data_updater.py --days 365 || echo "⚠️  Bootstrap failed"
    fi
else
    echo "ℹ️  FINNHUB_API_KEY not set. Updates disabled. Get a free key at https://finnhub.io"
fi

# ── 2. DeepVaR ───────────────────────────────────────────────────
PRICE_FILE="/app/data/sp100_daily_prices.csv"
NEED_DEEPVAR=false
if [ ! -f "$DEEPVAR_RESULTS" ]; then
    if [ -f "$PRICE_FILE" ]; then
        NEED_DEEPVAR=true
    else
        echo "⚠️  Cannot train DeepVaR — no price data available"
    fi
else
    # Check if prices have newer dates than DeepVaR
    if [ -f "$PRICE_FILE" ]; then
        PRICE_LATEST=$(tail -1 "$PRICE_FILE" | cut -d',' -f1)
        DEEPVAR_LATEST=$(tail -1 "$DEEPVAR_RESULTS" | cut -d',' -f2)
        if [ -n "$PRICE_LATEST" ] && [ -n "$DEEPVAR_LATEST" ] && [[ "$PRICE_LATEST" > "$DEEPVAR_LATEST" ]]; then
            NEED_DEEPVAR=true
        fi
    fi
    if [ "$NEED_DEEPVAR" = false ]; then
        ROWS=$(wc -l < "$DEEPVAR_RESULTS")
        echo "✅ DeepVaR results: $ROWS rows"
    fi
fi
if [ "$NEED_DEEPVAR" = true ]; then
    echo ""
    echo "🧠 Training DeepVaR (epochs: $DEEPVAR_EPOCHS)..."
    python /app/compute_deepvar.py --epochs "$DEEPVAR_EPOCHS" || echo "⚠️  DeepVaR training failed"
fi

# ── 3. Check old VaR cache format ────────────────────────────────
VAR_CACHE_DIR="/app/data/var_cache"
if [ -d "$VAR_CACHE_DIR" ]; then
    SAMPLE=$(find "$VAR_CACHE_DIR" -name "*.csv" -print -quit 2>/dev/null)
    if [ -n "$SAMPLE" ] && ! head -1 "$SAMPLE" | grep -q "deepVaR95"; then
        echo "🗑️  Old VaR cache (no DeepVaR). Removing..."
        rm -rf "$VAR_CACHE_DIR"
    fi
fi

echo ""
echo "🚀 Starting uvicorn..."
exec uvicorn main:app --host 0.0.0.0 --port 8000
