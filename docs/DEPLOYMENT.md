# Production deployment (HTTPS)

This guide covers hosting AlphaVision behind a public HTTPS URL. The most common mistake is pointing the frontend at a **Docker-internal hostname** (e.g. `http://alphavision-backend:8001`) — browsers cannot resolve that name, and HTTPS pages cannot call plain HTTP APIs (mixed content).

## How the frontend finds the API

`VITE_API_URL` is **baked into the frontend JavaScript at Docker build time** (see `src/services/api.ts`). After changing it in `.env`, you must rebuild:

```bash
docker compose build --no-cache alphavision-frontend
docker compose up -d
```

Rules:

- Use a **public URL** the user's browser can reach (usually `https://your-domain.example.com`).
- Use **HTTPS** when the dashboard is served over HTTPS.
- **No trailing slash** and **no `/api` suffix** — endpoints are already `/api/meta`, `/api/stocks/...`, etc.
- **Never** use Docker service names (`alphavision-backend`, `localhost` from inside another container) for production builds.

## Recommended: same domain (reverse proxy)

Serve the UI and API on one HTTPS origin. The browser calls `https://your-domain.example.com/api/...` — **no CORS** and **no mixed content**.

### 1. Set `.env`

```bash
VITE_API_URL=https://your-domain.example.com
VITE_CONTACT_EMAIL=george.makridis@expertai-lux.com
FINNHUB_API_KEY=...
# CORS_ORIGINS=   # leave empty for same-origin
```

### 2. Example nginx config

```nginx
server {
    listen 443 ssl;
    server_name your-domain.example.com;

    # ssl_certificate ...;
    # ssl_certificate_key ...;

    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        proxy_pass http://127.0.0.1:8001;
    }

    location /docs {
        proxy_pass http://127.0.0.1:8001;
    }

    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

Map `8001` → backend container, `8081` → frontend container (production compose defaults).

### 3. Build and run

```bash
./scripts/setup-env.sh
docker compose up --build -d
```

## Alternative: separate API subdomain

If the API is at `https://api.your-domain.example.com`:

```bash
VITE_API_URL=https://api.your-domain.example.com
CORS_ORIGINS=https://your-domain.example.com
```

Rebuild **both** frontend and backend after changing these. CORS is required because the browser sees two origins.

## Verify

```bash
curl -s https://your-domain.example.com/health
curl -s https://your-domain.example.com/api/meta
```

In the browser devtools Network tab, API requests should go to your **public HTTPS** URL, not `alphavision-backend` or `http://`.

## Local Docker (unchanged)

```bash
VITE_API_URL=http://localhost:8001
docker compose up --build -d
```

Dashboard: http://localhost:8081 — API: http://localhost:8001
