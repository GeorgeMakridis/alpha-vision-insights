# AlphaVision Insights - Financial Risk Analytics Dashboard

A comprehensive financial risk analytics platform with real-time data visualization, portfolio analysis, and advanced risk metrics.

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Data Files    │
│   (React/Vite)  │◄──►│   (FastAPI)     │◄──►│   (CSV/JSON)    │
│   Port: 8080    │    │   Port: 8000    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start (Docker)

### Option 1: Automated Deployment

```bash
# Deploy the complete stack
./deploy.sh production

# Or for development with hot reload
./deploy.sh development
```

### Option 2: Manual Docker Compose

```bash
# Setup backend data
cd backend && ./setup.sh && cd ..

# Deploy production stack
docker-compose up --build -d

# Or development stack
docker-compose -f docker-compose.dev.yml up --build -d
```

### Fast boot (default)

The API (`uvicorn`) starts **immediately** so `/health` goes green within seconds. A background script (`post_start.sh`) then runs the data updater (prices/news with FinBERT for new articles), optional full sentiment refresh (`DATA_REFRESH_SENTIMENT`), and DeepVaR (incremental when model artifacts exist). When disk updates finish, post-start calls `POST /api/admin/reload-data` so charts and metrics match the files on disk.

**Stale plot dates (fixed):** If post-start could not reload memory, the API would keep serving the CSV snapshot from process start while `post_start` wrote newer rows to disk—plots looked roughly “one week behind.” The Docker **`entrypoint.sh`** now generates an **ephemeral** `INTERNAL_RELOAD_TOKEN` when none is set, so the reload always runs inside the container (token value is never logged).

- **`INTERNAL_RELOAD_TOKEN`**: Optional in `.env`. If unset or empty, the entrypoint sets a random secret for this run so post-start reload works. For production, set an explicit long secret (for example `openssl rand -hex 32`) especially if the API port is reachable beyond localhost.
- **`SKIP_POST_START_TASKS`**: Set to `true` or `1` to skip the background pipeline (API-only boot).
- **`HF_TOKEN`** / **`HF_HOME`**: Optional Hugging Face token and cache directory (Compose defaults `HF_HOME` to `/app/data/hf_home` under the mounted volume so FinBERT weights survive container recreation).

### Deep backfill without slowing first boot

Keep `DATA_UPDATER_DAYS` modest on boot (default 10). After the stack is healthy, run a deeper news backfill:

```bash
docker-compose exec alphavision-backend python /app/data_updater.py --news-only --days 365
```

Then reload in-memory data from inside the running backend (inherits container env): `docker compose exec alphavision-backend sh -c 'curl -fsS -X POST -H "X-Admin-Token: $INTERNAL_RELOAD_TOKEN" http://127.0.0.1:8000/api/admin/reload-data'`. If you set a fixed token in `.env`, you can instead call the mapped host port with that same value.

### DeepVaR (automatic in background)

DeepVaR runs **after** the API is up, inside `post_start.sh`. On first run it trains if `data/deepvar_results/deepvar_dashboard.csv` is missing; training can take ~10–30 minutes on CPU. Results persist in the volume; later runs use **incremental** DeepVaR when `deepar_model` exists and price data is newer than the dashboard CSV.

### Option 3: Development Setup

```bash
# Backend
cd backend
pip install -r requirements.txt
./setup.sh
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Frontend (new terminal)
npm install
npm run dev
```

## 📊 Features

- **Real-time Stock Data**: Historical prices for S&P 100 stocks
- **News Sentiment Analysis**: News headlines with sentiment scores
- **Risk Metrics**: VaR, volatility, Sharpe ratio calculations
- **Portfolio Analysis**: Multi-asset portfolio management
- **Interactive Charts**: Real-time data visualization
- **Responsive Design**: Mobile-friendly dashboard

## 🔧 Technology Stack

### Frontend
- **React 18** + TypeScript
- **Vite** - Fast build tool
- **shadcn/ui** - Modern UI components
- **Tailwind CSS** - Utility-first CSS
- **Recharts** - Data visualization
- **React Query** - Data fetching

### Backend
- **FastAPI** - Modern Python web framework
- **Pandas** - Data processing
- **NumPy** - Numerical computations
- **Docker** - Containerization

### Data
- **S&P 100 Price Data**: 6,325 days of historical prices
- **News Sentiment**: 102MB of news articles with sentiment analysis
- **Market cap** (per ticker): written to `backend/data/market_caps.json` by the data updater (Finnhub `stock/profile2` when `FINNHUB_API_KEY` is set, otherwise Yahoo Finance via `yfinance`). Refreshed with each `run_update` (Docker `post_start.sh` background pipeline and optional daily scheduler).

## 🐳 Docker Services

### Production Stack
- **alphavision-frontend**: React dashboard (port 8081)
- **alphavision-backend**: FastAPI API (port 8001); post-start pipeline runs data update + DeepVaR in the background

### Development Stack
- Hot reloading for both frontend and backend
- Volume mounting for live code changes
- Development dependencies included

## 📋 Available Commands

```bash
# Deployment
./deploy.sh production     # Deploy production stack
./deploy.sh development    # Deploy development stack
./deploy.sh logs          # Show service logs
./deploy.sh stop          # Stop all services
./deploy.sh cleanup       # Clean up Docker resources
./deploy.sh health        # Check service health

# Docker Compose
docker-compose up --build -d                    # Production (first run trains DeepVaR ~10-30 min)
docker-compose -f docker-compose.dev.yml up --build -d  # Development
docker-compose down                              # Stop services
docker-compose logs -f                          # View logs
```

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/stocks` | List all stocks |
| GET | `/api/stocks/{ticker}/price-history` | Stock price data |
| GET | `/api/stocks/{ticker}/news` | News headlines |
| GET | `/api/stocks/{ticker}/metrics` | Risk metrics |
| POST | `/api/portfolio/metrics` | Portfolio calculations |
| POST | `/api/portfolio/price-history` | Portfolio charts |
| GET | `/api/market/summary` | Market statistics |
| POST | `/api/admin/reload-data` | Reload CSV/JSON + DeepVaR from disk; header `X-Admin-Token: INTERNAL_RELOAD_TOKEN` (503 if not configured, e.g. `uvicorn` without Docker entrypoint) |

## 🌐 Access Points

Once deployed, access the application at:

- **Dashboard**: http://localhost:8080
- **API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 📁 Project Structure

```
alpha-vision-insights/
├── src/                    # Frontend source code
│   ├── components/         # React components
│   ├── services/          # API service layer
│   └── pages/             # Page components
├── backend/               # Backend API
│   ├── main.py           # FastAPI application
│   ├── data/             # Data files
│   └── requirements.txt   # Python dependencies
├── Dockerfile             # Frontend container
├── Dockerfile.dev         # Frontend dev container
├── docker-compose.yml     # Production stack
├── docker-compose.dev.yml # Development stack
└── deploy.sh             # Deployment script
```

## 🔍 Monitoring

### Health Checks
- Backend: `curl http://localhost:8000/health`
- Frontend: `curl http://localhost:8080`

### Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f alphavision-backend
docker-compose logs -f alphavision-frontend
```

## 🚨 Troubleshooting

### Common Issues

1. **Port conflicts**
   ```bash
   # Check what's using the ports
   lsof -i :8080
   lsof -i :8000
   ```

2. **Data files missing**
   ```bash
   # Ensure data files are in root directory
   ls -la sp100_daily_prices.csv news_sentiment_updated.json
   ```

3. **Docker not running**
   ```bash
   # Start Docker Desktop
   # Then run deployment
   ./deploy.sh production
   ```

4. **Charts end on an old date but news is current**  
   Price and VaR series come from `backend/data/sp100_daily_prices.csv`, which is updated with **Yahoo Finance** (`yfinance` → `fc.yahoo.com`). News uses **Finnhub** and can still update when Yahoo is blocked. Check backend logs for `Failed to connect to fc.yahoo.com` or `Zero price data from Yahoo Finance`.  
   - Retry tuning: set `YFINANCE_DOWNLOAD_RETRIES` (default 5), `YFINANCE_RETRY_BACKOFF_BASE_SEC` (default 3), `YFINANCE_RETRY_BACKOFF_MAX_SEC` (default 60) in `.env` or `docker-compose.yml`.  
   - Try `YFINANCE_DOWNLOAD_THREADS=true` only if sequential downloads are slow and your network allows many parallel connections.  
   - Fix network access to Yahoo from the container (VPN, firewall, DNS), or run `python data_updater.py` on the host where Yahoo works, then restart the backend so it reloads the CSV.

### Performance Optimization

- **Backend**: Data cached in memory on startup
- **Frontend**: React Query provides client-side caching
- **Docker**: Volume mounting for data persistence

## 🔐 Security

- CORS configured for frontend domains
- Input validation on all endpoints
- Proper error handling
- Health checks for monitoring
- **`INTERNAL_RELOAD_TOKEN`**: Treat as a secret when you set it in `.env`. With the default Docker entrypoint, a random token is created when unset so `post_start` can reload over localhost. Do not expose port 8000 to untrusted networks without TLS and additional controls.

## 📈 Next Steps

1. **Authentication**: Add user authentication
2. **Real-time Updates**: WebSocket integration
3. **Advanced Analytics**: More sophisticated risk models
4. **Data Pipeline**: Automated data updates
5. **Monitoring**: Application monitoring and logging

## ⚖️ Legal and disclaimers

**AlphaVision Insights is open-source software for research and education. It is not financial advice, not investment advice, and not offered by a regulated financial services firm.**

When you run the app locally or deploy it, users should see:

- **First visit:** acknowledgment modal (stored in browser `localStorage`)
- **Dashboard:** compliance strip with link to the full disclaimer
- **Widgets:** badges on AI/model outputs (Deep VaR, sentiment, chat, etc.)

| Page | Route |
|------|--------|
| About | `/about` |
| Methodology | `/methodology` |
| Disclaimer | `/disclaimer` |
| Terms | `/terms` |
| Privacy | `/privacy` |
| Open-source licenses | `/licenses` |

Copy in `src/content/legal/` is **template text for engineering** — have qualified counsel review before a public launch.

Optional frontend env (see [`.env.example`](.env.example)):

```bash
VITE_GITHUB_REPO=https://github.com/your-org/alpha-vision-insights
VITE_CONTACT_EMAIL=legal@example.com
```

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

**For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)**
