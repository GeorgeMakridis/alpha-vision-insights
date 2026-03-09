#!/bin/bash
set -e

DEEPVAR_RESULTS="/app/data/deepvar_results/deepvar_dashboard.csv"
DEEPVAR_EPOCHS="${DEEPVAR_EPOCHS:-200}"

echo "================================================"
echo "  AlphaVision Backend - Starting"
echo "================================================"

# ── Check for DeepVaR pre-computed results ───────────────────────
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

# ── Invalidate old VaR cache if it lacks DeepVaR columns ────────
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
