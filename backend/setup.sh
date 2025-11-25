#!/bin/bash

# Setup script for AlphaVision backend
echo "Setting up AlphaVision backend..."

# Create data directory
mkdir -p data

# Copy data files from root directory
echo "Copying data files..."
cp ../sp100_daily_prices.csv data/
cp ../news_sentiment_updated.json data/

# Check if files were copied successfully
if [ -f "data/sp100_daily_prices.csv" ] && [ -f "data/news_sentiment_updated.json" ]; then
    echo "✅ Data files copied successfully"
    echo "📊 Price data: $(wc -l < data/sp100_daily_prices.csv) rows"
    echo "📰 News data: $(du -h data/news_sentiment_updated.json | cut -f1)"
else
    echo "❌ Error: Data files not found in root directory"
    exit 1
fi

echo "🚀 Backend setup complete!"
echo ""
echo "To run the backend:"
echo "  Development: uvicorn main:app --reload --host 0.0.0.0 --port 8000"
echo "  Docker: docker-compose up --build" 