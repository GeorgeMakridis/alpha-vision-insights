#!/bin/bash
# Background pipeline: data update, optional sentiment refresh, DeepVaR, VaR cache check,
# then trigger in-memory reload via /api/admin/reload-data (requires INTERNAL_RELOAD_TOKEN).
# Started from entrypoint.sh after uvicorn is up.

set -e

DEEPVAR_RESULTS="/app/data/deepvar_results/deepvar_dashboard.csv"
DEEPVAR_EPOCHS="${DEEPVAR_EPOCHS:-200}"
UPDATER_DAYS="${DATA_UPDATER_DAYS:-10}"
PRICE_FILE="/app/data/sp100_daily_prices.csv"

# Reload API in-memory state from disk (prices, news, DeepVaR, VaR precalc).
reload_in_memory() {
    local label="${1:-post-start}"
    local token="${INTERNAL_RELOAD_TOKEN:-}"
    if [ -z "$token" ]; then
        echo "⚠️  INTERNAL_RELOAD_TOKEN unset — skipping HTTP reload ($label)"
        return 0
    fi
    local i=1
    while [ "$i" -le 15 ]; do
        if curl -fsS -X POST \
            -H "X-Admin-Token: ${token}" \
            "http://127.0.0.1:8000/api/admin/reload-data" >/dev/null 2>&1; then
            echo "✅ In-memory data reloaded ($label)"
            return 0
        fi
        echo "  Waiting for API / reload attempt $i/15 ($label)..."
        sleep 2
        i=$((i + 1))
    done
    echo "⚠️  POST /api/admin/reload-data failed after retries ($label)"
    return 0
}

echo ""
echo "================================================"
echo "  AlphaVision post-start (background)"
echo "================================================"

# ── 1. Data update ───────────────────────────────────────────────
if [ -f "$PRICE_FILE" ]; then
    echo ""
    echo "📊 Running data update check (days=${UPDATER_DAYS})..."
    if [ -n "$FINNHUB_API_KEY" ]; then
        python /app/data_updater.py --days "$UPDATER_DAYS" || echo "⚠️  Data update failed, continuing"
    else
        python /app/data_updater.py --prices-only --days "$UPDATER_DAYS" || echo "⚠️  Price update failed, continuing"
        echo "ℹ️  FINNHUB_API_KEY not set — news not updated."
    fi
else
    echo ""
    echo "📊 No price data found — bootstrapping..."
    if [ -n "$FINNHUB_API_KEY" ]; then
        python /app/data_updater.py --days 365 || echo "⚠️  Bootstrap failed"
    else
        python /app/data_updater.py --prices-only --days 365 || echo "⚠️  Price bootstrap failed"
        echo "ℹ️  FINNHUB_API_KEY not set — news not updated."
    fi
fi

# ── 1b. Optional: Refresh sentiment (FinBERT) ───────────────────
if [ "${DATA_REFRESH_SENTIMENT}" = "true" ] || [ "${DATA_REFRESH_SENTIMENT}" = "1" ]; then
    echo ""
    echo "📊 Refreshing sentiment for all news articles (FinBERT)..."
    python /app/data_updater.py --refresh-sentiment || echo "⚠️  Sentiment refresh failed, continuing"
fi

# Reload now so charts/news match disk before long DeepVaR step
echo ""
reload_in_memory "after data update"

# ── 2. DeepVaR ───────────────────────────────────────────────────
NEED_DEEPVAR=false
if [ ! -f "$DEEPVAR_RESULTS" ]; then
    if [ -f "$PRICE_FILE" ]; then
        NEED_DEEPVAR=true
    else
        echo "⚠️  Cannot train DeepVaR — no price data available"
    fi
else
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
    DEEPVAR_MODEL="/app/data/deepvar_results/deepar_model"
    if [ -f "$DEEPVAR_RESULTS" ] && [ -d "$DEEPVAR_MODEL" ]; then
        echo "🧠 Running incremental DeepVaR (no retraining)..."
        python /app/compute_deepvar.py --incremental || echo "⚠️  DeepVaR incremental failed"
    else
        echo "🧠 Training DeepVaR (epochs: $DEEPVAR_EPOCHS)..."
        python /app/compute_deepvar.py --epochs "$DEEPVAR_EPOCHS" || echo "⚠️  DeepVaR training failed"
    fi
fi

# ── 3. Old VaR cache format ──────────────────────────────────────
VAR_CACHE_DIR="/app/data/var_cache"
if [ -d "$VAR_CACHE_DIR" ]; then
    SAMPLE=$(find "$VAR_CACHE_DIR" -name "*.csv" -print -quit 2>/dev/null)
    if [ -n "$SAMPLE" ] && ! head -1 "$SAMPLE" | grep -q "deepVaR95"; then
        echo "🗑️  Old VaR cache (no DeepVaR). Removing..."
        rm -rf "$VAR_CACHE_DIR"
    fi
fi

# Final reload: DeepVaR + VaR cache on disk
echo ""
reload_in_memory "after DeepVaR"
echo "✅ Post-start pipeline finished"
