FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Make entrypoint executable
RUN chmod +x /app/entrypoint.sh

# Create data directories (data files will be mounted as volume)
RUN mkdir -p /app/data /app/data/deepvar_results

# Expose port
EXPOSE 8000

# Health check — extended start_period in docker-compose for first-run DeepVaR training
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Use entrypoint that handles DeepVaR training on first run
ENTRYPOINT ["/app/entrypoint.sh"] 