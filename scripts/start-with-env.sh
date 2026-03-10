#!/bin/bash
# Load .env and start the stack (ensures FINNHUB_API_KEY etc. are passed to containers)
set -e
cd "$(dirname "$0")/.."
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi
docker-compose up -d "$@"
