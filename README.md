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

## 🐳 Docker Services

### Production Stack
- **alphavision-frontend**: React dashboard (port 8080)
- **alphavision-backend**: FastAPI API (port 8000)

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
docker-compose up --build -d                    # Production
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

### Performance Optimization

- **Backend**: Data cached in memory on startup
- **Frontend**: React Query provides client-side caching
- **Docker**: Volume mounting for data persistence

## 🔐 Security

- CORS configured for frontend domains
- Input validation on all endpoints
- Proper error handling
- Health checks for monitoring

## 📈 Next Steps

1. **Authentication**: Add user authentication
2. **Real-time Updates**: WebSocket integration
3. **Advanced Analytics**: More sophisticated risk models
4. **Data Pipeline**: Automated data updates
5. **Monitoring**: Application monitoring and logging

## 📄 License

This project is licensed under the MIT License.

---

**For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)**
