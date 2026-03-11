#!/bin/bash
# Start the stack using .env (no need to export FINNHUB_API_KEY manually)
# Run: ./scripts/start-with-env.sh
set -e
cd "$(dirname "$0")/.."
set -a
[ -f .env ] && source .env
set +a
docker-compose up -d "$@"
