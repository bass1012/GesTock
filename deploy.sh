#!/bin/bash
set -e

# Configuration
APP_DIR="/home/ubuntu/GesTock"
HEALTH_URL="https://gestock.allsite.cloud/api/health"

echo "🚀 Starting deployment of GesStock..."

# Navigate to app directory
cd "$APP_DIR"

# Pull latest changes
echo "📥 Pulling latest changes from main..."
git fetch origin main
git reset --hard origin/main

# Build and restart containers
echo "📦 Building and starting containers..."
docker compose -f docker-compose.prod.yml up -d --build --remove-orphans

# Run database migrations
echo "⚙️ Running database migrations..."
docker compose -f docker-compose.prod.yml exec -T backend npx prisma db push --accept-data-loss

# Prune old images to save space
echo "🧹 Cleaning up old Docker images..."
docker image prune -f

# Health check
echo "🏥 Running health check..."
sleep 10
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL")
if [ "$STATUS" != "200" ]; then
    echo "❌ Health check FAILED: HTTP $STATUS"
    echo "Check logs with: docker compose -f docker-compose.prod.yml logs -f"
    exit 1
fi

# Configure backup cron (idempotent — skips if already present)
CRON_JOB="0 2 * * * $APP_DIR/backup-postgres.sh >> /var/log/gestock-backup.log 2>&1"
if ! crontab -l 2>/dev/null | grep -qF "backup-postgres.sh"; then
    echo "⏰ Registering daily backup cron job..."
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "   Cron registered: $CRON_JOB"
else
    echo "⏰ Backup cron already configured — skipping."
fi

echo "✅ Deployment finished successfully! (HTTP $STATUS)"
echo "Check logs with: docker compose -f docker-compose.prod.yml logs -f"
