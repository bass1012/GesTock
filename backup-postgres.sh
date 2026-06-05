#!/bin/bash
# backup-postgres.sh — Sauvegarde quotidienne de la base PostgreSQL
# Déployer sur le VPS dans /home/ubuntu/GesTock/
# Cron : 0 2 * * * /home/ubuntu/GesTock/backup-postgres.sh >> /var/log/gestock-backup.log 2>&1
#
# Configuration (via variables d'environnement ou défauts) :
#   BACKUP_DIR            — dossier de destination (défaut: /home/ubuntu/backups/postgres)
#   BACKUP_ENCRYPTION_KEY — clé AES-256-CBC pour chiffrer les backups (défaut: pas de chiffrement)
#   BACKUP_S3_DEST        — destination S3/rclone pour copie hors-site (défaut: pas de copie)
#   RETENTION_DAYS        — rétention locale en jours (défaut: 7)
#   ALERT_EMAIL           — email pour alertes d'échec (défaut: désactivé)
#   SLACK_WEBHOOK_URL     — webhook Slack pour alertes (défaut: désactivé)
#   MIN_BACKUP_SIZE_KB    — taille minimale attendue en KB (défaut: 10)
#   HEALTH_URL            — URL health check à vérifier après backup (optionnel)

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
BACKUP_DIR="${BACKUP_DIR:-/home/ubuntu/backups/postgres}"
CONTAINER="${CONTAINER:-gestock-postgres}"
DB_USER="${DB_USER:-gestock}"
DB_NAME="${DB_NAME:-gestock_db}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-}"
S3_DEST="${BACKUP_S3_DEST:-}"
ALERT_EMAIL="${ALERT_EMAIL:-}"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
MIN_BACKUP_SIZE_KB="${MIN_BACKUP_SIZE_KB:-10}"
LOG_FILE="/var/log/gestock-backup.log"
DATE=$(date +%Y%m%d_%H%M%S)
BASE_FILE="gestock_${DATE}"
BACKUP_FILE="${BACKUP_DIR}/${BASE_FILE}.sql.gz"
START_TIME=$(date +%s)

mkdir -p "$BACKUP_DIR"

# ── Fonctions d'alerte ────────────────────────────────────────────────────────

send_alert_email() {
    local subject="$1"
    local body="$2"

    if [ -n "$ALERT_EMAIL" ] && command -v mail &>/dev/null; then
        echo "$body" | mail -s "$subject" "$ALERT_EMAIL"
        echo "[$(date)] Alert email sent to $ALERT_EMAIL: $subject"
    fi
}

send_slack_alert() {
    local message="$1"
    local color="${2:-danger}"  # "danger" (rouge) ou "good" (vert)

    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -s -X POST "$SLACK_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{
                \"attachments\": [{
                    \"color\": \"${color}\",
                    \"title\": \"GesStock Backup\",
                    \"text\": \"${message}\",
                    \"footer\": \"VPS $(hostname) — $(date '+%Y-%m-%d %H:%M:%S')\",
                    \"ts\": $(date +%s)
                }]
            }" > /dev/null
        echo "[$(date)] Slack alert sent: $message"
    fi
}

notify_failure() {
    local reason="$1"
    local hostname
    hostname=$(hostname)

    echo "[$(date)] ❌ BACKUP FAILED: $reason"

    send_alert_email \
        "❌ [GesStock] Backup FAILED on $hostname" \
        "Backup failed on $hostname at $(date)

Reason: $reason

Database: $DB_NAME
Container: $CONTAINER
Backup dir: $BACKUP_DIR

Please investigate immediately!
Logs: $LOG_FILE"

    send_slack_alert \
        "❌ *Backup échoué* sur \`$hostname\`\\nRaison: $reason\\nBase: \`$DB_NAME\`\\nLogs: \`$LOG_FILE\`" \
        "danger"
}

notify_success() {
    local backup_file="$1"
    local size_human="$2"
    local duration="$3"
    local hostname
    hostname=$(hostname)

    echo "[$(date)] ✅ Backup completed: $backup_file ($size_human, ${duration}s)"

    # Alerte Slack de succès (optionnel — commenter si trop verbeux)
    send_slack_alert \
        "✅ *Backup réussi* sur \`$hostname\`\\nFichier: \`$(basename "$backup_file")\`\\nTaille: $size_human\\nDurée: ${duration}s" \
        "good"
}

# ── Trap global : notification en cas d'erreur inattendue ────────────────────
trap 'notify_failure "Unexpected error on line $LINENO (exit code: $?)"' ERR

# ── Backup ───────────────────────────────────────────────────────────────────
echo "[$(date)] Starting PostgreSQL backup..."
echo "[$(date)] Container: $CONTAINER | DB: $DB_NAME | Dir: $BACKUP_DIR"

# Vérifier que le conteneur est en cours d'exécution
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    notify_failure "Container '$CONTAINER' is not running"
    exit 1
fi

# Dump et compression en une seule passe (pas de fichier temporaire non chiffré)
docker exec "$CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"

# ── Vérification de la taille minimale ───────────────────────────────────────
SIZE_KB=$(du -k "$BACKUP_FILE" | cut -f1)
SIZE_HUMAN=$(du -sh "$BACKUP_FILE" | cut -f1)

if [ "$SIZE_KB" -lt "$MIN_BACKUP_SIZE_KB" ]; then
    rm -f "$BACKUP_FILE"
    notify_failure "Backup file too small (${SIZE_KB}KB < ${MIN_BACKUP_SIZE_KB}KB minimum) — possible empty dump"
    exit 1
fi

echo "[$(date)] Backup created: $BACKUP_FILE ($SIZE_HUMAN)"

# ── Chiffrement du backup si une clé est configurée ──────────────────────────
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

# ── Copie hors-site (S3 / rclone) ────────────────────────────────────────────
if [ -n "$S3_DEST" ]; then
    if command -v rclone &>/dev/null; then
        if ! rclone copy "$BACKUP_FILE" "$S3_DEST"; then
            notify_failure "rclone upload failed to $S3_DEST"
            exit 1
        fi
        echo "[$(date)] Backup uploaded to remote: $S3_DEST"
    elif command -v aws &>/dev/null; then
        if ! aws s3 cp "$BACKUP_FILE" "$S3_DEST"; then
            notify_failure "AWS S3 upload failed to $S3_DEST"
            exit 1
        fi
        echo "[$(date)] Backup uploaded to S3: $S3_DEST"
    else
        # Pas de CLI cloud : avertissement non-bloquant
        echo "[$(date)] ⚠️  WARNING: BACKUP_S3_DEST set but neither rclone nor aws CLI found — skipping offsite copy"
        send_slack_alert \
            "⚠️ *Backup hors-site ignoré* sur \`$(hostname)\`\\nRaison: rclone/aws non trouvé\\nFichier local: \`$(basename "$BACKUP_FILE")\`" \
            "warning"
    fi
fi

# ── Nettoyage des anciens backups ─────────────────────────────────────────────
DELETED_COUNT=$(find "$BACKUP_DIR" -name "gestock_*.sql.gz*" -mtime "+${RETENTION_DAYS}" -print | wc -l)
find "$BACKUP_DIR" -name "gestock_*.sql.gz*" -mtime "+${RETENTION_DAYS}" -delete
echo "[$(date)] Old backups (>${RETENTION_DAYS} days) cleaned up: $DELETED_COUNT file(s) deleted"

# ── Rapport de santé : lister les backups disponibles ────────────────────────
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "gestock_*.sql.gz*" | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
echo "[$(date)] Backup inventory: $BACKUP_COUNT file(s), total $TOTAL_SIZE"

# ── Calcul de la durée ────────────────────────────────────────────────────────
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# ── Désactiver le trap ERR pour la notification de succès ────────────────────
trap - ERR

# ── Notification de succès ────────────────────────────────────────────────────
notify_success "$BACKUP_FILE" "$SIZE_HUMAN" "$DURATION"
echo "[$(date)] Backup completed successfully in ${DURATION}s"
