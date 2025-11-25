# AlphaVision Containerized Setup Guide

## 🎉 Complete Containerized Solution

We've successfully created a fully containerized AlphaVision platform with both frontend and backend services running in Docker containers.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    AlphaVision Stack                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐              │
│  │   Frontend      │    │   Backend       │              │
│  │   Container     │◄──►│   Container     │              │
│  │   Port: 8080    │    │   Port: 8000    │              │
│  │   React/Vite    │    │   FastAPI       │              │
│  └─────────────────┘    └─────────────────┘              │
│           │                       │                       │
│           └───────────────────────┼───────────────────────┤
│                                   │                       │
│  ┌─────────────────────────────────┴─────────────────────┐ │
│  │              Data Volume                              │ │
│  │  ┌─────────────────┐    ┌─────────────────┐          │ │
│  │  │ Price Data      │    │ News Data       │          │ │
│  │  │ CSV: 6,325 rows │    │ JSON: 102MB    │          │ │
│  │  └─────────────────┘    └─────────────────┘          │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 🐳 Container Configuration

### Frontend Container (`Dockerfile`)

**Production Build:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
RUN npm install -g serve
EXPOSE 8080
CMD ["serve", "-s", "dist", "-l", "8080"]
```

**Development Build (`Dockerfile.dev`):**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 8080
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "8080"]
```

### Backend Container (`backend/Dockerfile`)

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 🚀 Deployment Options

### 1. Automated Deployment (Recommended)

```bash
# Production deployment
./deploy.sh production

# Development deployment with hot reload
./deploy.sh development

# Check service health
./deploy.sh health

# View logs
./deploy.sh logs

# Stop services
./deploy.sh stop
```

### 2. Manual Docker Compose

**Production:**
```bash
docker-compose up --build -d
```

**Development:**
```bash
docker-compose -f docker-compose.dev.yml up --build -d
```

### 3. Individual Container Management

```bash
# Build frontend
docker build -t alphavision-frontend .

# Build backend
cd backend && docker build -t alphavision-backend .

# Run frontend
docker run -p 8080:8080 alphavision-frontend

# Run backend
docker run -p 8000:8000 -v $(pwd)/backend/data:/app/data alphavision-backend
```

## 📊 Service Configuration

### Production Stack (`docker-compose.yml`)

```yaml
services:
  alphavision-backend:
    build: ./backend
    ports: ["8000:8000"]
    volumes: ["./backend/data:/app/data"]
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  alphavision-frontend:
    build: .
    ports: ["8080:8080"]
    environment: ["VITE_API_URL=http://localhost:8000"]
    depends_on:
      alphavision-backend:
        condition: service_healthy
```

### Development Stack (`docker-compose.dev.yml`)

```yaml
services:
  alphavision-backend:
    build: ./backend
    ports: ["8000:8000"]
    volumes: 
      - "./backend/data:/app/data"
      - "./backend:/app"
    command: ["uvicorn", "main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"]

  alphavision-frontend:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports: ["8080:8080"]
    volumes:
      - ".:/app"
      - "/app/node_modules"
    environment: ["VITE_API_URL=http://localhost:8000"]
```

## 🔧 Environment Variables

### Frontend Environment
```bash
VITE_API_URL=http://localhost:8000  # Backend API URL
```

### Backend Environment
```bash
PYTHONPATH=/app  # Python path for imports
```

## 📁 Volume Mounts

### Data Persistence
- **Backend Data**: `./backend/data:/app/data`
- **Development Code**: `./backend:/app` (dev only)
- **Frontend Code**: `.:/app` (dev only)

### Data Files
- `sp100_daily_prices.csv` → `backend/data/sp100_daily_prices.csv`
- `news_sentiment_updated.json` → `backend/data/news_sentiment_updated.json`

## 🔍 Monitoring & Health Checks

### Health Check Endpoints
- **Backend**: `http://localhost:8000/health`
- **Frontend**: `http://localhost:8080`

### Docker Health Checks
```bash
# Check container health
docker ps

# View health check logs
docker inspect alphavision-backend | grep -A 10 Health
```

### Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f alphavision-frontend
docker-compose logs -f alphavision-backend

# Individual containers
docker logs alphavision-frontend
docker logs alphavision-backend
```

## 🚨 Troubleshooting

### Common Issues

1. **Port Conflicts**
   ```bash
   # Check port usage
   lsof -i :8080
   lsof -i :8000
   
   # Stop conflicting services
   docker-compose down
   ```

2. **Data Files Missing**
   ```bash
   # Ensure data files exist
   ls -la sp100_daily_prices.csv news_sentiment_updated.json
   
   # Run setup script
   cd backend && ./setup.sh
   ```

3. **Container Build Failures**
   ```bash
   # Clean build
   docker-compose down
   docker system prune -f
   docker-compose up --build
   ```

4. **Network Issues**
   ```bash
   # Check network connectivity
   docker network ls
   docker network inspect alpha-vision-insights_alphavision-network
   ```

### Performance Optimization

1. **Build Optimization**
   ```dockerfile
   # Use multi-stage builds
   # Cache dependencies
   # Minimize image size
   ```

2. **Runtime Optimization**
   ```yaml
   # Use health checks
   # Implement proper restart policies
   # Configure resource limits
   ```

## 🔐 Security Considerations

### Container Security
- **Non-root users**: Containers run as non-root
- **Minimal base images**: Alpine Linux for smaller attack surface
- **Health checks**: Monitor container health
- **Resource limits**: Prevent resource exhaustion

### Network Security
- **Internal networking**: Services communicate via Docker network
- **Port exposure**: Only necessary ports exposed
- **CORS configuration**: Proper cross-origin settings

## 📈 Scaling Considerations

### Horizontal Scaling
```bash
# Scale backend services
docker-compose up --scale alphavision-backend=3

# Load balancer configuration
# Reverse proxy setup
```

### Vertical Scaling
```yaml
# Resource limits
services:
  alphavision-backend:
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
```

## 🎯 Production Deployment

### Environment-Specific Configuration
```bash
# Production environment
export VITE_API_URL=https://api.alphavision.com
export NODE_ENV=production

# Development environment
export VITE_API_URL=http://localhost:8000
export NODE_ENV=development
```

### Reverse Proxy (Nginx)
```nginx
upstream frontend {
    server alphavision-frontend:8080;
}

upstream backend {
    server alphavision-backend:8000;
}

server {
    listen 80;
    server_name alphavision.com;
    
    location / {
        proxy_pass http://frontend;
    }
    
    location /api/ {
        proxy_pass http://backend;
    }
}
```

## 📋 Deployment Checklist

- [ ] Data files present in root directory
- [ ] Docker and Docker Compose installed
- [ ] Ports 8080 and 8000 available
- [ ] Sufficient disk space for data files
- [ ] Network connectivity for container communication
- [ ] Health checks passing
- [ ] Logs showing successful startup
- [ ] Frontend can connect to backend API

## 🎉 Success Indicators

### Backend Health
```bash
curl http://localhost:8000/health
# Expected: {"status": "healthy", "timestamp": "..."}
```

### Frontend Health
```bash
curl http://localhost:8080
# Expected: HTML response with React app
```

### API Endpoints
```bash
curl http://localhost:8000/api/stocks
# Expected: JSON array of available stocks
```

---

**The containerized setup provides a complete, production-ready deployment solution for the AlphaVision platform!** 