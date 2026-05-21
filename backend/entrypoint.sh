#!/bin/bash
set -e

echo "================================================"
echo "  AlphaVision Backend - Starting"
echo "================================================"

# Ephemeral admin token so post_start can call POST /api/admin/reload-data on localhost.
# If empty, in-memory price_data would stay on the startup snapshot while disk updates.
if [ -z "${INTERNAL_RELOAD_TOKEN:-}" ]; then
    export INTERNAL_RELOAD_TOKEN="$(python3 -c 'import secrets; print(secrets.token_hex(16))')"
    echo "INTERNAL_RELOAD_TOKEN was unset — generated ephemeral token for post-start reload (value not logged)"
fi

# Heavy work (data updater, FinBERT refresh, DeepVaR) runs in background after API is up.
# Set SKIP_POST_START_TASKS=true to only run uvicorn (e.g. debugging).
if [ "${SKIP_POST_START_TASKS:-}" = "true" ] || [ "${SKIP_POST_START_TASKS:-}" = "1" ]; then
    echo "SKIP_POST_START_TASKS set — background pipeline disabled"
else
    /app/post_start.sh &
    echo "📎 post_start.sh launched in background (data + DeepVaR + reload)"
fi

echo ""
echo "🚀 Starting uvicorn..."
exec uvicorn main:app --host 0.0.0.0 --port 8000
