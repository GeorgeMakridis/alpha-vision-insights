# AlphaVision Backend API

A FastAPI-based backend service for the AlphaVision Financial Risk Analytics Dashboard.

## Features

- **Real-time Stock Data**: Serves historical price data for S&P 100 stocks
- **News Sentiment Analysis**: Provides news headlines with sentiment scores
- **Risk Metrics Calculation**: Computes VaR, volatility, and other risk metrics
- **Portfolio Analysis**: Supports multi-asset portfolio calculations
- **RESTful API**: Clean, documented endpoints with automatic OpenAPI docs

## Data Sources

- **Price Data**: `sp100_daily_prices.csv` - Historical daily prices for S&P 100 stocks
- **News Data**: `news_sentiment_updated.json` - News articles with sentiment analysis

## API Endpoints

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/stocks` | List all available stocks |
| GET | `/api/stocks/{ticker}/price-history` | Get price history for a stock |
| GET | `/api/stocks/{ticker}/news` | Get news headlines for a stock |
| GET | `/api/stocks/{ticker}/metrics` | Get risk metrics for a stock |
| POST | `/api/portfolio/metrics` | Calculate portfolio metrics |
| POST | `/api/portfolio/price-history` | Get portfolio price history |
| GET | `/api/market/summary` | Get market summary statistics |

### Query Parameters

- `days`: Number of days for price history (1-365, default: 30)
- `limit`: Number of news items to retrieve (1-50, default: 10)

## Docker Deployment

### Quick Start

```bash
# Build and run with Docker Compose
docker-compose up --build

# Or build and run manually
docker build -t alphavision-backend .
docker run -p 8000:8000 -v $(pwd)/data:/app/data alphavision-backend
```

### Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run locally
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## API Documentation

Once running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Data Format

### Stock Price History Response
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

### News Response
```json
{
  "news": [
    {
      "title": "Apple Reports Strong Q4 Earnings",
      "source": "Reuters",
      "date": "2024-01-15",
      "sentiment": 0.75,
      "url": "https://example.com/article"
    }
  ]
}
```

### Risk Metrics Response
```json
{
  "metrics": {
    "parametricVaR95": 2.5,
    "monteCarloVaR95": 2.7,
    "deepVaR95": 2.3,
    "parametricVaR99": 3.8,
    "monteCarloVaR99": 4.1,
    "deepVaR99": 3.5,
    "sharpeRatio": 1.2,
    "volatility": 15.5,
    "returns": 12.3,
    "maxDrawdown": -8.7
  }
}
```

## Error Handling

The API returns standard HTTP status codes:
- `200`: Success
- `400`: Bad Request (invalid parameters)
- `404`: Not Found (stock not found)
- `500`: Internal Server Error

## Performance

- **Data Loading**: Cached on startup for fast response times
- **Memory Usage**: Optimized for large datasets
- **Response Time**: < 100ms for most endpoints

## Security

- CORS enabled for frontend integration
- Input validation on all endpoints
- Error messages don't expose sensitive information 