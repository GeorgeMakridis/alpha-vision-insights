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
    
    if [ ! -f "sp100_daily_prices.csv" ] || [ ! -f "news_sentiment_updated.json" ]; then
        print_error "Data files not found in root directory"
        print_status "Please ensure sp100_daily_prices.csv and news_sentiment_updated.json are in the root directory"
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
    echo "  - Frontend: http://localhost:8080"
    echo "  - Backend API: http://localhost:8000"
    echo "  - API Docs: http://localhost:8000/docs"
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
    print_status "Checking service health..."
    
    # Wait for services to start
    sleep 10
    
    # Check backend health
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        print_success "Backend is healthy"
    else
        print_warning "Backend health check failed"
    fi
    
    # Check frontend health
    if curl -f http://localhost:8080 > /dev/null 2>&1; then
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
            setup_backend
            deploy_production
            check_health
            ;;
        "development"|"dev")
            check_docker
            setup_backend
            deploy_development
            check_health
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
            check_health
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