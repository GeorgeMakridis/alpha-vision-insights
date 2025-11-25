# AlphaVision Insights - Deployment Guide

This guide covers deploying the complete AlphaVision Financial Risk Analytics platform with both frontend and backend components.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Data Files    │
│   (React/Vite)  │◄──►│   (FastAPI)     │◄──►│   (CSV/JSON)    │
│   Port: 8080    │    │   Port: 8000    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📋 Prerequisites

- **Docker & Docker Compose** (for containerized deployment)
- **Node.js 18+** (for frontend development)
- **Python 3.11+** (for backend development)
- **Git** (for version control)

## 🚀 Quick Start (Docker)

### 1. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd alpha-vision-insights

# Setup backend data
cd backend
./setup.sh
cd ..
```

### 2. Start Backend

```bash
# Navigate to backend directory
cd backend

# Build and run with Docker Compose
docker-compose up --build

# Or run manually
docker build -t alphavision-backend .
docker run -p 8000:8000 -v $(pwd)/data:/app/data alphavision-backend
```

### 3. Start Frontend

```bash
# In a new terminal, from the root directory
npm install
npm run dev
```

### 4. Access the Application

- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## 🔧 Development Setup

### Backend Development

```bash
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Setup data files
./setup.sh

# Run in development mode
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 📊 Data Integration

### Data Files

The backend requires two data files in the root directory:

1. **`sp100_daily_prices.csv`** - Historical price data for S&P 100 stocks
   - Format: Date, AAPL, MSFT, GOOGL, ...
   - Size: ~10MB, 6,325 rows, 99 columns

2. **`news_sentiment_updated.json`** - News articles with sentiment analysis
   - Format: Date-based structure with articles and sentiment scores
   - Size: ~102MB

### Data Loading

The backend automatically loads and caches data on startup:

```python
# Data is loaded in main.py
price_data = pd.read_csv('data/sp100_daily_prices.csv')
news_data = json.load(open('data/news_sentiment_updated.json'))
```

## 🔌 API Endpoints

### Core Endpoints

| Method | Endpoint | Description | Frontend Usage |
|--------|----------|-------------|----------------|
| GET | `/health` | Health check | System monitoring |
| GET | `/api/stocks` | List all stocks | Asset selector |
| GET | `/api/stocks/{ticker}/price-history` | Stock price data | Charts |
| GET | `/api/stocks/{ticker}/news` | News headlines | News component |
| GET | `/api/stocks/{ticker}/metrics` | Risk metrics | VaR cards |
| POST | `/api/portfolio/metrics` | Portfolio calculations | Portfolio analysis |
| POST | `/api/portfolio/price-history` | Portfolio charts | Portfolio charts |

### Frontend Integration

The frontend uses React Query for API calls:

```typescript
// Example: Fetching stock data
const { data: stockData } = useQuery({
  queryKey: ['stock-price-history', ticker],
  queryFn: () => apiService.getStockPriceHistory(ticker),
  enabled: !!ticker,
});
```

## 🐳 Docker Configuration

### Backend Dockerfile

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Docker Compose

```yaml
version: '3.8'
services:
  alphavision-backend:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - ./backend/data:/app/data
    restart: unless-stopped
```

## 🔍 Monitoring & Health Checks

### Backend Health Check

```bash
curl http://localhost:8000/health
# Response: {"status": "healthy", "timestamp": "2024-01-15T10:30:00"}
```

### API Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🚨 Troubleshooting

### Common Issues

1. **Backend won't start**
   ```bash
   # Check if data files exist
   ls -la backend/data/
   
   # Check logs
   docker logs alphavision-backend
   ```

2. **Frontend can't connect to backend**
   ```bash
   # Check CORS settings in backend/main.py
   # Verify API_BASE_URL in frontend
   ```

3. **Data not loading**
   ```bash
   # Run setup script
   cd backend && ./setup.sh
   ```

### Performance Optimization

1. **Backend Caching**: Data is cached in memory on startup
2. **Frontend Caching**: React Query provides client-side caching
3. **Docker Volume**: Data files are mounted as volumes for persistence

## 📈 Production Deployment

### Environment Variables

```bash
# Frontend (.env)
VITE_API_URL=https://api.alphavision.com

# Backend (environment variables)
PYTHONPATH=/app
```

### Production Build

```bash
# Frontend
npm run build

# Backend
docker build -t alphavision-backend:prod .
```

### Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name alphavision.com;
    
    # Frontend
    location / {
        root /var/www/alphavision;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🔐 Security Considerations

- **CORS**: Configured for frontend domains
- **Input Validation**: All endpoints validate input
- **Error Handling**: Proper HTTP status codes
- **Rate Limiting**: Consider adding for production

## 📝 API Response Examples

### Stock Price History
```json
{
  "priceHistory": [
    {
      "date": "2024-01-15",
      "price": 185.92,
      "sentiment": 0.25,
      "volume": 45000
    }
  ]
}
```

### Risk Metrics
```json
{
  "metrics": {
    "parametricVaR95": 2.5,
    "monteCarloVaR95": 2.7,
    "deepVaR95": 2.3,
    "sharpeRatio": 1.2,
    "volatility": 15.5,
    "returns": 12.3
  }
}
```

## 🎯 Next Steps

1. **Add Authentication**: Implement user authentication
2. **Real-time Updates**: Add WebSocket support
3. **Advanced Analytics**: Implement more sophisticated risk models
4. **Data Pipeline**: Set up automated data updates
5. **Monitoring**: Add application monitoring and logging

---

**For support or questions, please refer to the API documentation at http://localhost:8000/docs** 