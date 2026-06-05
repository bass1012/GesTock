#!/bin/bash
# restore-postgres.sh — Restauration sécurisée de la base PostgreSQL
# Usage : ./restore-postgres.sh <fichier_backup.sql.gz[.enc]>
#
# ⚠️  Ce script DÉTRUIT la base de données existante avant restauration.
#     Il demande une confirmation explicite sauf si --force est passé.
#
# Options :
#   --force                — bypass la confirmation interactive
#   --dry-run              — afficher les étapes sans restaurer
#   --target-db <name>     — restaurer dans une autre base (défaut: DB_NAME env)
#
# Configuration (variables d'environnement) :
#   CONTAINER              — nom du conteneur PostgreSQL (défaut: gestock-postgres)
#   DB_USER                — utilisateur PostgreSQL (défaut: gestock)
#   DB_NAME                — base cible (défaut: gestock_db)
#   BACKUP_ENCRYPTION_KEY  — clé de déchiffrement si backup chiffré
#   ALERT_EMAIL            — email pour alertes
#   SLACK_WEBHOOK_URL      — webhook Slack pour alertes

set -euo pipefail

# ── Couleurs pour la lisibilité ────────────────────────────────────────────────
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ── Fonctions utilitaires ──────────────────────────────────────────────────────
log()     { echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
log_ok()  { echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${GREEN}✅ $*${NC}"; }
log_err() { echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${RED}❌ $*${NC}" >&2; }
log_warn(){ echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${YELLOW}⚠️  $*${NC}"; }
log_info(){ echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${BLUE}ℹ️  $*${NC}"; }

usage() {
    cat <<EOF
Usage: $(basename "$0") [OPTIONS] <backup_file>

Options:
  --force              Bypass la confirmation interactive
  --dry-run            Simuler la restauration sans rien modifier
  --target-db <name>   Restaurer dans une base différente de \$DB_NAME

Variables d'environnement:
  CONTAINER              Nom du conteneur PostgreSQL (défaut: gestock-postgres)
  DB_USER                Utilisateur PostgreSQL (défaut: gestock)
  DB_NAME                Base de données cible (défaut: gestock_db)
  BACKUP_ENCRYPTION_KEY  Clé de déchiffrement pour backups chiffrés (.enc)
  ALERT_EMAIL            Email pour les notifications
  SLACK_WEBHOOK_URL      Webhook Slack pour les notifications

Exemples:
  $(basename "$0") /home/ubuntu/backups/postgres/gestock_20240603_020000.sql.gz
  $(basename "$0") --force --target-db gestock_restore gestock_20240603.sql.gz.enc
  $(basename "$0") --dry-run gestock_20240603_020000.sql.gz
EOF
    exit 1
}

# ── Configuration ──────────────────────────────────────────────────────────────
CONTAINER="${CONTAINER:-gestock-postgres}"
DB_USER="${DB_USER:-gestock}"
DB_NAME="${DB_NAME:-gestock_db}"
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-}"
ALERT_EMAIL="${ALERT_EMAIL:-}"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"

FORCE=false
DRY_RUN=false
TARGET_DB=""
BACKUP_FILE=""

# ── Parsing des arguments ──────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case "$1" in
        --force)    FORCE=true; shift ;;
        --dry-run)  DRY_RUN=true; shift ;;
        --target-db) TARGET_DB="$2"; shift 2 ;;
        --help|-h)  usage ;;
        -*)         log_err "Unknown option: $1"; usage ;;
        *)          BACKUP_FILE="$1"; shift ;;
    esac
done

# ── Validation des arguments ───────────────────────────────────────────────────
if [ -z "$BACKUP_FILE" ]; then
    log_err "Aucun fichier de backup spécifié."
    usage
fi

if [ ! -f "$BACKUP_FILE" ]; then
    log_err "Fichier introuvable: $BACKUP_FILE"
    exit 1
fi

# Base cible finale
DB_TARGET="${TARGET_DB:-$DB_NAME}"

# ── Alertes ────────────────────────────────────────────────────────────────────
send_slack_alert() {
    local message="$1"
    local color="${2:-danger}"
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -s -X POST "$SLACK_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"attachments\":[{\"color\":\"${color}\",\"title\":\"GesStock Restore\",\"text\":\"${message}\",\"footer\":\"VPS $(hostname) — $(date '+%Y-%m-%d %H:%M:%S')\",\"ts\":$(date +%s)}]}" \
            > /dev/null || true
    fi
}

# ── Affichage du plan ──────────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}       GesStock — Restauration PostgreSQL${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""
log_info "Fichier backup : $(realpath "$BACKUP_FILE")"
log_info "Taille         : $(du -sh "$BACKUP_FILE" | cut -f1)"
log_info "Conteneur      : $CONTAINER"
log_info "Utilisateur    : $DB_USER"
log_info "Base cible     : $DB_TARGET"

if [ "$DRY_RUN" = true ]; then
    log_warn "MODE DRY-RUN — aucune modification ne sera effectuée"
fi

echo ""

# ── Confirmation interactive ───────────────────────────────────────────────────
if [ "$FORCE" = false ] && [ "$DRY_RUN" = false ]; then
    echo -e "${RED}⚠️  ATTENTION : Cette opération va SUPPRIMER et RECRÉER la base '$DB_TARGET'.${NC}"
    echo -e "${RED}    Toutes les données actuelles seront PERDUES.${NC}"
    echo ""
    read -r -p "Confirmer la restauration ? Tapez 'RESTAURER' pour continuer : " CONFIRM
    if [ "$CONFIRM" != "RESTAURER" ]; then
        log_warn "Restauration annulée."
        exit 0
    fi
    echo ""
fi

START_TIME=$(date +%s)

# ── Trap sur erreur ────────────────────────────────────────────────────────────
trap 'log_err "Restauration échouée à la ligne $LINENO (code: $?)"; send_slack_alert "❌ *Restauration échouée* sur $(hostname)\nFichier: $(basename "$BACKUP_FILE")" "danger"' ERR

# ── Étape 1 : Vérifier le conteneur ───────────────────────────────────────────
log "Étape 1/6 : Vérification du conteneur..."

if [ "$DRY_RUN" = false ]; then
    if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
        log_err "Conteneur '$CONTAINER' non trouvé ou arrêté"
        exit 1
    fi
fi
log_ok "Conteneur actif : $CONTAINER"

# ── Étape 2 : Déchiffrement si nécessaire ─────────────────────────────────────
log "Étape 2/6 : Préparation du fichier..."

RESTORE_FILE="$BACKUP_FILE"
TEMP_DECRYPTED=""

if [[ "$BACKUP_FILE" == *.enc ]]; then
    if [ -z "$ENCRYPTION_KEY" ]; then
        log_err "Le fichier est chiffré (.enc) mais BACKUP_ENCRYPTION_KEY n'est pas défini"
        exit 1
    fi
    TEMP_DECRYPTED=$(mktemp /tmp/gestock_restore_XXXXXX.sql.gz)
    log_info "Déchiffrement AES-256-CBC en cours..."
    if [ "$DRY_RUN" = false ]; then
        openssl enc -d -aes-256-cbc -salt -pbkdf2 -iter 100000 \
            -in "$BACKUP_FILE" \
            -out "$TEMP_DECRYPTED" \
            -pass "pass:${ENCRYPTION_KEY}"
        RESTORE_FILE="$TEMP_DECRYPTED"
    fi
    log_ok "Fichier déchiffré : $(du -sh "$TEMP_DECRYPTED" 2>/dev/null | cut -f1 || echo 'N/A')"
fi

# Nettoyage du fichier temporaire à la sortie
cleanup_temp() {
    if [ -n "$TEMP_DECRYPTED" ] && [ -f "$TEMP_DECRYPTED" ]; then
        rm -f "$TEMP_DECRYPTED"
        log "Fichier temporaire supprimé"
    fi
}
trap 'cleanup_temp; log_err "Restauration échouée à la ligne $LINENO (code: $?)"; send_slack_alert "❌ *Restauration échouée* sur $(hostname)" "danger"' ERR
trap cleanup_temp EXIT

# ── Étape 3 : Vérification de l'intégrité du backup ──────────────────────────
log "Étape 3/6 : Vérification de l'intégrité du fichier gzip..."

if [ "$DRY_RUN" = false ]; then
    if ! gzip -t "$RESTORE_FILE" 2>/dev/null; then
        log_err "Le fichier gzip est corrompu : $RESTORE_FILE"
        exit 1
    fi
fi
log_ok "Intégrité gzip vérifiée"

# ── Étape 4 : Backup de sauvegarde avant écrasement ──────────────────────────
log "Étape 4/6 : Backup de précaution (pre-restore snapshot)..."

PRE_RESTORE_BACKUP="/tmp/gestock_pre_restore_$(date +%Y%m%d_%H%M%S).sql.gz"
if [ "$DRY_RUN" = false ]; then
    docker exec "$CONTAINER" pg_dump -U "$DB_USER" "$DB_TARGET" 2>/dev/null | gzip > "$PRE_RESTORE_BACKUP" || {
        log_warn "Impossible de créer le snapshot pre-restore (la base n'existe peut-être pas encore) — continuation"
        rm -f "$PRE_RESTORE_BACKUP"
        PRE_RESTORE_BACKUP=""
    }
    if [ -n "$PRE_RESTORE_BACKUP" ] && [ -f "$PRE_RESTORE_BACKUP" ]; then
        log_ok "Snapshot pre-restore : $PRE_RESTORE_BACKUP ($(du -sh "$PRE_RESTORE_BACKUP" | cut -f1))"
    fi
else
    log_info "[DRY-RUN] Skipping pre-restore snapshot"
fi

# ── Étape 5 : Recréation de la base de données ────────────────────────────────
log "Étape 5/6 : Recréation de la base de données '$DB_TARGET'..."

if [ "$DRY_RUN" = false ]; then
    # Terminer les connexions actives
    docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -c \
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_TARGET' AND pid <> pg_backend_pid();" \
        > /dev/null 2>&1 || true

    # Drop et recréation
    docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -c \
        "DROP DATABASE IF EXISTS \"$DB_TARGET\";" > /dev/null
    docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -c \
        "CREATE DATABASE \"$DB_TARGET\" OWNER \"$DB_USER\";" > /dev/null
    log_ok "Base '$DB_TARGET' recrée"
else
    log_info "[DRY-RUN] DROP DATABASE + CREATE DATABASE '$DB_TARGET'"
fi

# ── Étape 6 : Restauration ────────────────────────────────────────────────────
log "Étape 6/6 : Restauration des données..."

if [ "$DRY_RUN" = false ]; then
    if ! gunzip -c "$RESTORE_FILE" | docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_TARGET" > /dev/null; then
        log_err "Erreur lors de la restauration psql"
        if [ -n "${PRE_RESTORE_BACKUP:-}" ] && [ -f "$PRE_RESTORE_BACKUP" ]; then
            log_warn "Tentative de re-restauration depuis le snapshot pre-restore..."
            gunzip -c "$PRE_RESTORE_BACKUP" | docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_TARGET" > /dev/null
            log_warn "Re-restauration depuis snapshot pré-restore réussie"
        fi
        exit 1
    fi
    log_ok "Données restaurées dans '$DB_TARGET'"
else
    log_info "[DRY-RUN] gunzip | psql vers '$DB_TARGET'"
fi

# ── Rapport final ──────────────────────────────────────────────────────────────
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}       ✅ Restauration terminée en ${DURATION}s${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo ""
log_ok "Base restaurée   : $DB_TARGET"
log_ok "Depuis           : $(basename "$BACKUP_FILE")"
log_ok "Durée            : ${DURATION}s"
if [ -n "${PRE_RESTORE_BACKUP:-}" ] && [ -f "$PRE_RESTORE_BACKUP" ]; then
    log_info "Snapshot pré-restore conservé : $PRE_RESTORE_BACKUP"
    log_info "Supprimez-le manuellement une fois la restauration validée : rm $PRE_RESTORE_BACKUP"
fi
echo ""

# Notification Slack de succès
send_slack_alert \
    "✅ *Restauration réussie* sur \`$(hostname)\`\\nBase: \`$DB_TARGET\`\\nFichier: \`$(basename "$BACKUP_FILE")\`\\nDurée: ${DURATION}s" \
    "good"

# Désactiver les traps
trap - ERR EXIT
cleanup_temp
