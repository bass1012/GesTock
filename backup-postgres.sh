#!/bin/bash
# backup-postgres.sh — Sauvegarde quotidienne de la base PostgreSQL
# Déployer sur le VPS dans /home/ubuntu/GesTock/
# Cron : 0 2 * * * /home/ubuntu/GesTock/backup-postgres.sh >> /var/log/gestock-backup.log 2>&1
#
# Configuration (via variables d'environnement ou défauts) :
#   BACKUP_DIR        — dossier de destination (défaut: /home/ubuntu/backups/postgres)
#   BACKUP_ENCRYPTION_KEY — clé AES-256-CBC pour chiffrer les backups (défaut: pas de chiffrement)
#   BACKUP_S3_DEST    — destination S3/rclone pour copie hors-site (défaut: pas de copie)
#   RETENTION_DAYS    — rétention locale en jours (défaut: 7)

set -e

BACKUP_DIR="${BACKUP_DIR:-/home/ubuntu/backups/postgres}"
CONTAINER="${CONTAINER:-gestock-postgres}"
DB_USER="${DB_USER:-gestock}"
DB_NAME="${DB_NAME:-gestock_db}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-}"
S3_DEST="${BACKUP_S3_DEST:-}"
DATE=$(date +%Y%m%d_%H%M%S)
BASE_FILE="gestock_${DATE}"
BACKUP_FILE="${BACKUP_DIR}/${BASE_FILE}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting PostgreSQL backup..."

# Dump et compression en une seule passe (pas de fichier temporaire non chiffré)
docker exec "$CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"

SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "[$(date)] Backup created: $BACKUP_FILE ($SIZE)"

# Chiffrement du backup si une clé est configurée
if [ -n "$ENCRYPTION_KEY" ]; then
    ENCRYPTED_FILE="${BACKUP_DIR}/${BASE_FILE}.sql.gz.enc"
    openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 \
        -in "$BACKUP_FILE" \
        -out "$ENCRYPTED_FILE" \
        -pass "pass:${ENCRYPTION_KEY}"
    rm -f "$BACKUP_FILE"
    BACKUP_FILE="$ENCRYPTED_FILE"
    echo "[$(date)] Backup encrypted: $ENCRYPTED_FILE"
fi

# Copie hors-site (S3 / rclone) si configuré
if [ -n "$S3_DEST" ]; then
    if command -v rclone &> /dev/null; then
        rclone copy "$BACKUP_FILE" "$S3_DEST"
        echo "[$(date)] Backup copied to remote: $S3_DEST"
    elif command -v aws &> /dev/null; then
        aws s3 cp "$BACKUP_FILE" "$S3_DEST"
        echo "[$(date)] Backup copied to S3: $S3_DEST"
    else
        echo "[$(date)] WARNING: S3 destination set but neither rclone nor aws CLI found"
    fi
fi

# Supprimer les sauvegardes plus anciennes que RETENTION_DAYS
find "$BACKUP_DIR" -name "gestock_*.sql.gz*" -mtime +$RETENTION_DAYS -delete
echo "[$(date)] Old backups (>$RETENTION_DAYS days) cleaned up"

echo "[$(date)] Backup completed successfully"
