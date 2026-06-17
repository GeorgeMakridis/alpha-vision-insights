#!/usr/bin/env bash
# Create .env from .env.example when missing; ensure INTERNAL_RELOAD_TOKEN exists.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env.example ]]; then
  echo "ERROR: .env.example not found in $ROOT"
  exit 1
fi

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

# Generate reload token if empty
if grep -q '^INTERNAL_RELOAD_TOKEN=$' .env 2>/dev/null || \
   grep -q '^INTERNAL_RELOAD_TOKEN=\s*$' .env 2>/dev/null; then
  TOKEN="$(openssl rand -hex 32)"
  if [[ "$(uname)" == "Darwin" ]]; then
    sed -i '' "s|^INTERNAL_RELOAD_TOKEN=.*|INTERNAL_RELOAD_TOKEN=${TOKEN}|" .env
  else
    sed -i "s|^INTERNAL_RELOAD_TOKEN=.*|INTERNAL_RELOAD_TOKEN=${TOKEN}|" .env
  fi
  echo "Generated INTERNAL_RELOAD_TOKEN in .env"
fi

missing=()
grep -q '^FINNHUB_API_KEY=$' .env && missing+=("FINNHUB_API_KEY")
grep -q '^FINNHUB_API_KEY=\s*$' .env && missing+=("FINNHUB_API_KEY")

if [[ ${#missing[@]} -gt 0 ]]; then
  echo ""
  echo "WARNING: Set these in .env before news updates will work:"
  printf '  - %s\n' "${missing[@]}"
  echo "  Get a free Finnhub key: https://finnhub.io/dashboard"
fi

if grep -q '^XAI_API_URL=$' .env && grep -q '^XAI_USE_MOCK=true' .env; then
  echo "INFO: XAI_USE_MOCK=true — headline XAI uses dev mock until XAI_API_URL is set."
fi

echo ""
echo "Next: docker compose up --build -d"
echo "  Dashboard: http://localhost:8081"
echo "  API:       http://localhost:8001/docs"
