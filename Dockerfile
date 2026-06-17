FROM node:18-alpine

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Inject Vite env at build time (see .env.example)
ARG VITE_API_URL
ARG VITE_GITHUB_REPO
ARG VITE_CONTACT_EMAIL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GITHUB_REPO=$VITE_GITHUB_REPO
ENV VITE_CONTACT_EMAIL=$VITE_CONTACT_EMAIL

# Build the application with the correct API URL
RUN npm run build

# Install serve to run the built app
RUN npm install -g serve

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080 || exit 1

# Start the application
CMD ["serve", "-s", "dist", "-l", "8080"] 