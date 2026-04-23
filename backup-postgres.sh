#!/bin/bash
# backup-postgres.sh — Sauvegarde quotidienne de la base PostgreSQL
# Déployer sur le VPS dans /home/ubuntu/GesTock/
# Cron : 0 2 * * * /home/ubuntu/GesTock/backup-postgres.sh >> /var/log/gestock-backup.log 2>&1

set -e

BACKUP_DIR="/home/ubuntu/backups/postgres"
CONTAINER="gestock-postgres"
DB_USER="gestock"
DB_NAME="gestock_db"
RETENTION_DAYS=7
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/gestock_${DATE}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting PostgreSQL backup..."

# Dump et compression en une seule passe (pas de fichier temporaire non chiffré)
docker exec "$CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"

SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "[$(date)] Backup created: $BACKUP_FILE ($SIZE)"

# Supprimer les sauvegardes plus anciennes que RETENTION_DAYS
find "$BACKUP_DIR" -name "gestock_*.sql.gz" -mtime +$RETENTION_DAYS -delete
echo "[$(date)] Old backups (>$RETENTION_DAYS days) cleaned up"

echo "[$(date)] Backup completed successfully"
