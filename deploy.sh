#!/bin/bash

# AlphaVision Complete Stack Deployment Script

set -e

echo "🚀 AlphaVision Complete Stack Deployment"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Setup backend data
setup_backend() {
    print_status "Setting up backend data..."
    
    # Skip if data already exists in backend/data
    if [ -f "backend/data/sp100_daily_prices.csv" ] && [ -f "backend/data/news_sentiment_updated.json" ]; then
        print_success "Backend data already present (backend/data/)"
        return 0
    fi
    
    if [ ! -f "sp100_daily_prices.csv" ] || [ ! -f "news_sentiment_updated.json" ]; then
        print_error "Data files not found"
        print_status "Either place sp100_daily_prices.csv and news_sentiment_updated.json in root, or run the data updater first"
        exit 1
    fi
    
    cd backend
    ./setup.sh
    cd ..
    print_success "Backend data setup complete"
}

# Build and run production stack
deploy_production() {
    print_status "Deploying production stack..."
    
    # Stop existing containers
    docker-compose down 2>/dev/null || true
    
    # Build and start services
    docker-compose up --build -d
    
    print_success "Production stack deployed"
    print_status "Services will be available at:"
    echo "  - Frontend: http://localhost:8081"
    echo "  - Backend API: http://localhost:8001"
    echo "  - API Docs: http://localhost:8001/docs"
}

# Build and run development stack
deploy_development() {
    print_status "Deploying development stack..."
    
    # Stop existing containers
    docker-compose -f docker-compose.dev.yml down 2>/dev/null || true
    
    # Build and start services
    docker-compose -f docker-compose.dev.yml up --build -d
    
    print_success "Development stack deployed"
    print_status "Services will be available at:"
    echo "  - Frontend: http://localhost:8080 (with hot reload)"
    echo "  - Backend API: http://localhost:8000 (with auto-reload)"
    echo "  - API Docs: http://localhost:8000/docs"
}

# Check service health
check_health() {
    local backend_port="${1:-8001}"
    local frontend_port="${2:-8081}"
    print_status "Checking service health (backend :${backend_port}, frontend :${frontend_port})..."

    sleep 10

    if curl -f "http://localhost:${backend_port}/health" > /dev/null 2>&1; then
        print_success "Backend is healthy"
    else
        print_warning "Backend health check failed"
    fi

    if curl -f "http://localhost:${frontend_port}" > /dev/null 2>&1; then
        print_success "Frontend is healthy"
    else
        print_warning "Frontend health check failed"
    fi
}

# Show logs
show_logs() {
    print_status "Showing service logs..."
    docker-compose logs -f
}

# Stop services
stop_services() {
    print_status "Stopping services..."
    docker-compose down
    docker-compose -f docker-compose.dev.yml down 2>/dev/null || true
    print_success "Services stopped"
}

# Clean up
cleanup() {
    print_status "Cleaning up Docker resources..."
    docker system prune -f
    print_success "Cleanup complete"
}

# Main script logic
main() {
    case "${1:-production}" in
        "production")
            check_docker
            if [ -f "scripts/setup-env.sh" ]; then
                bash scripts/setup-env.sh
            elif [ ! -f ".env" ]; then
                print_warning ".env missing — copy .env.example to .env and set FINNHUB_API_KEY"
            fi
            setup_backend
            deploy_production
            check_health 8001 8081
            ;;
        "development"|"dev")
            check_docker
            if [ -f "scripts/setup-env.sh" ]; then
                bash scripts/setup-env.sh
            fi
            setup_backend
            deploy_development
            check_health 8000 8080
            ;;
        "logs")
            show_logs
            ;;
        "stop")
            stop_services
            ;;
        "cleanup")
            cleanup
            ;;
        "health")
            if docker compose ps alphavision-backend 2>/dev/null | grep -q '8000->8000'; then
                check_health 8000 8080
            else
                check_health 8001 8081
            fi
            ;;
        *)
            echo "Usage: $0 [production|development|logs|stop|cleanup|health]"
            echo ""
            echo "Commands:"
            echo "  production  - Deploy production stack (default)"
            echo "  development - Deploy development stack with hot reload"
            echo "  logs        - Show service logs"
            echo "  stop        - Stop all services"
            echo "  cleanup     - Clean up Docker resources"
            echo "  health      - Check service health"
            exit 1
            ;;
    esac
}

# Run main function
main "$@" 