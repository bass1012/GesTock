#!/bin/bash

# Configuration
APP_DIR="/home/ubuntu/GesTock"

echo "🚀 Starting deployment of GesStock..."

# Navigate to app directory
cd $APP_DIR

# Pull latest changes (assuming git is used)
# git pull origin main

# Build and restart containers
echo "📦 Building and starting containers..."
docker compose -f docker-compose.prod.yml up -d --build

# Run database migrations
echo "⚙️ Running database migrations..."
docker compose -f docker-compose.prod.yml exec backend npx prisma db push

# Prune old images to save space
echo "🧹 Cleaning up old Docker images..."
docker image prune -f

echo "✅ Deployment finished successfully!"
echo "Check logs with: docker compose -f docker-compose.prod.yml logs -f"
