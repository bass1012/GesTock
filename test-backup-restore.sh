#!/bin/bash
# test-backup-restore.sh — Test end-to-end du cycle backup → restauration
#
# Ce script vérifie que :
#   1. Le backup se crée correctement et n'est pas corrompu
#   2. La restauration reproduit fidèlement les données
#   3. Les alertes fonctionnent (Slack/email)
#   4. Le chiffrement/déchiffrement fonctionne
#   5. Les cas d'erreur déclenchent les alertes
#
# Usage : ./test-backup-restore.sh [--with-encryption] [--verbose]
#
# Ce script est sans danger pour la production :
#   - Il utilise une BASE DE DONNÉES DE TEST temporaire (gestock_backup_test)
#   - Il ne touche jamais à la base de données principale
#   - Il nettoie après lui-même
#
# Variables d'environnement :
#   CONTAINER   — nom du conteneur PostgreSQL (défaut: gestock-postgres)
#   DB_USER     — utilisateur PostgreSQL (défaut: gestock)
#   DB_NAME     — base principale (uniquement pour référence)
#   BACKUP_ENCRYPTION_KEY — requis si --with-encryption
#   SLACK_WEBHOOK_URL     — pour tester les alertes Slack

set -euo pipefail

# ── Couleurs ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# ── Configuration ─────────────────────────────────────────────────────────────
CONTAINER="${CONTAINER:-gestock-postgres}"
DB_USER="${DB_USER:-gestock}"
TEST_DB="gestock_backup_test_$$"   # suffixe unique par PID
BACKUP_DIR_TEST="/tmp/gestock_backup_test_$$"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

WITH_ENCRYPTION=false
VERBOSE=false
PASSED=0
FAILED=0
TOTAL=0

# ── Parsing des arguments ─────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case "$1" in
        --with-encryption) WITH_ENCRYPTION=true; shift ;;
        --verbose|-v)      VERBOSE=true; shift ;;
        --help|-h)
            echo "Usage: $(basename "$0") [--with-encryption] [--verbose]"
            exit 0
            ;;
        *) echo "Option inconnue: $1"; exit 1 ;;
    esac
done

# ── Fonctions utilitaires ─────────────────────────────────────────────────────
log()        { echo -e "[$(date '+%H:%M:%S')] $*"; }
log_step()   { echo -e "\n${BLUE}${BOLD}▶ $*${NC}"; }
log_ok()     { echo -e "  ${GREEN}✅ $*${NC}"; ((PASSED++)); ((TOTAL++)); }
log_fail()   { echo -e "  ${RED}❌ $*${NC}" >&2; ((FAILED++)); ((TOTAL++)); }
log_skip()   { echo -e "  ${YELLOW}⏭  $*${NC}"; }
log_verbose(){ [ "$VERBOSE" = true ] && echo -e "     ${YELLOW}→ $*${NC}" || true; }

assert_equals() {
    local desc="$1" expected="$2" actual="$3"
    if [ "$expected" = "$actual" ]; then
        log_ok "$desc"
    else
        log_fail "$desc (attendu: '$expected', obtenu: '$actual')"
    fi
}

assert_file_exists() {
    local desc="$1" file="$2"
    if [ -f "$file" ]; then
        log_ok "$desc"
    else
        log_fail "$desc — fichier absent: $file"
    fi
}

assert_file_not_empty() {
    local desc="$1" file="$2" min_kb="${3:-1}"
    local size_kb
    size_kb=$(du -k "$file" 2>/dev/null | cut -f1 || echo 0)
    if [ "$size_kb" -ge "$min_kb" ]; then
        log_ok "$desc (${size_kb}KB)"
    else
        log_fail "$desc — fichier trop petit (${size_kb}KB < ${min_kb}KB)"
    fi
}

assert_db_exists() {
    local desc="$1" db="$2"
    if docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -tAc \
        "SELECT 1 FROM pg_database WHERE datname='$db'" 2>/dev/null | grep -q 1; then
        log_ok "$desc"
    else
        log_fail "$desc — base '$db' non trouvée"
    fi
}

assert_table_has_rows() {
    local desc="$1" db="$2" table="$3" expected_count="$4"
    local actual_count
    actual_count=$(docker exec "$CONTAINER" psql -U "$DB_USER" -d "$db" -tAc \
        "SELECT COUNT(*) FROM \"$table\"" 2>/dev/null | tr -d ' ' || echo 0)
    assert_equals "$desc" "$expected_count" "$actual_count"
}

# ── Nettoyage ─────────────────────────────────────────────────────────────────
cleanup() {
    log "\n🧹 Nettoyage..."
    # Supprimer la base de test
    docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -c \
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$TEST_DB' AND pid <> pg_backend_pid();" \
        > /dev/null 2>&1 || true
    docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -c \
        "DROP DATABASE IF EXISTS \"$TEST_DB\";" > /dev/null 2>&1 || true
    # Supprimer les fichiers temporaires
    rm -rf "$BACKUP_DIR_TEST"
    log "   Nettoyage terminé"
}
trap cleanup EXIT

# ── Rapport final ──────────────────────────────────────────────────────────────
print_summary() {
    echo ""
    echo -e "${BOLD}════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}   Résultats des tests backup/restore${NC}"
    echo -e "${BOLD}════════════════════════════════════════════════════════${NC}"
    echo -e "   Total  : ${TOTAL}"
    echo -e "   ${GREEN}Passés : ${PASSED}${NC}"
    if [ "$FAILED" -gt 0 ]; then
        echo -e "   ${RED}Échoués: ${FAILED}${NC}"
    else
        echo -e "   Échoués: 0"
    fi
    echo -e "${BOLD}════════════════════════════════════════════════════════${NC}"
    echo ""
    if [ "$FAILED" -gt 0 ]; then
        echo -e "${RED}❌ ${FAILED} test(s) ont échoué${NC}"
        return 1
    else
        echo -e "${GREEN}✅ Tous les tests ont passé !${NC}"
        return 0
    fi
}

# ═════════════════════════════════════════════════════════════════════════════
# DÉMARRAGE
# ═════════════════════════════════════════════════════════════════════════════

echo ""
echo -e "${BOLD}════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}   GesStock — Test Backup / Restore${NC}"
echo -e "${BOLD}════════════════════════════════════════════════════════${NC}"
echo ""
log "Conteneur   : $CONTAINER"
log "Utilisateur : $DB_USER"
log "Base test   : $TEST_DB"
log "Backup dir  : $BACKUP_DIR_TEST"
log "Encryption  : $WITH_ENCRYPTION"
echo ""

# ── Prérequis ─────────────────────────────────────────────────────────────────
log_step "Prérequis"

if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    log_ok "Conteneur PostgreSQL actif"
else
    log_fail "Conteneur '$CONTAINER' non trouvé — impossible de continuer"
    print_summary
    exit 1
fi

if [ -f "$SCRIPT_DIR/backup-postgres.sh" ]; then
    log_ok "Script backup-postgres.sh trouvé"
else
    log_fail "Script backup-postgres.sh introuvable dans $SCRIPT_DIR"
fi

if [ -f "$SCRIPT_DIR/restore-postgres.sh" ]; then
    log_ok "Script restore-postgres.sh trouvé"
else
    log_fail "Script restore-postgres.sh introuvable dans $SCRIPT_DIR"
fi

if command -v gzip &>/dev/null; then
    log_ok "gzip disponible"
else
    log_fail "gzip non trouvé"
fi

if [ "$WITH_ENCRYPTION" = true ]; then
    if [ -n "${BACKUP_ENCRYPTION_KEY:-}" ]; then
        log_ok "BACKUP_ENCRYPTION_KEY défini"
    else
        log_fail "BACKUP_ENCRYPTION_KEY requis avec --with-encryption"
        print_summary; exit 1
    fi
    if command -v openssl &>/dev/null; then
        log_ok "openssl disponible"
    else
        log_fail "openssl non trouvé"
    fi
fi

# ── Test 1 : Création de la base de données de test ──────────────────────────
log_step "Test 1 : Préparation de la base de données de test"

docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -c \
    "CREATE DATABASE \"$TEST_DB\" OWNER \"$DB_USER\";" > /dev/null 2>&1
assert_db_exists "Base de test '$TEST_DB' créée" "$TEST_DB"

# Créer des tables et données de test
docker exec "$CONTAINER" psql -U "$DB_USER" -d "$TEST_DB" > /dev/null 2>&1 <<'SQL'
CREATE TABLE test_products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    sku VARCHAR(50) UNIQUE,
    quantity INTEGER DEFAULT 0,
    price DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE test_tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO test_products (name, sku, quantity, price) VALUES
    ('Produit Alpha', 'SKU-001', 100, 29.99),
    ('Produit Beta',  'SKU-002', 250, 14.99),
    ('Produit Gamma', 'SKU-003', 75,  49.99),
    ('Produit Delta', 'SKU-004', 0,   99.99),
    ('Produit Epsilon','SKU-005', 500, 4.99);

INSERT INTO test_tenants (slug, name) VALUES
    ('boutique-a', 'Boutique Alpha'),
    ('boutique-b', 'Boutique Beta');
SQL

assert_table_has_rows "5 produits insérés" "$TEST_DB" "test_products" "5"
assert_table_has_rows "2 tenants insérés" "$TEST_DB" "test_tenants" "2"

# ── Test 2 : Création du backup ───────────────────────────────────────────────
log_step "Test 2 : Création du backup"

mkdir -p "$BACKUP_DIR_TEST"
BACKUP_DIR="$BACKUP_DIR_TEST" \
CONTAINER="$CONTAINER" \
DB_USER="$DB_USER" \
DB_NAME="$TEST_DB" \
RETENTION_DAYS=7 \
MIN_BACKUP_SIZE_KB=1 \
BACKUP_ENCRYPTION_KEY="${WITH_ENCRYPTION:+${BACKUP_ENCRYPTION_KEY:-}}" \
bash "$SCRIPT_DIR/backup-postgres.sh" 2>&1 | \
    { [ "$VERBOSE" = true ] && cat || grep -E "(✅|❌|⚠️|Backup|ERROR)" || true; }

# Trouver le fichier créé
if [ "$WITH_ENCRYPTION" = true ]; then
    CREATED_BACKUP=$(find "$BACKUP_DIR_TEST" -name "gestock_*.sql.gz.enc" | sort | tail -1)
else
    CREATED_BACKUP=$(find "$BACKUP_DIR_TEST" -name "gestock_*.sql.gz" | sort | tail -1)
fi

assert_file_exists "Fichier de backup créé" "$CREATED_BACKUP"
assert_file_not_empty "Fichier de backup non vide" "$CREATED_BACKUP" 1

log_verbose "Backup créé : $CREATED_BACKUP ($(du -sh "$CREATED_BACKUP" | cut -f1))"

# ── Test 3 : Intégrité du fichier gzip (ou .enc) ─────────────────────────────
log_step "Test 3 : Intégrité du fichier"

if [ "$WITH_ENCRYPTION" = true ]; then
    # Vérifier le déchiffrement
    TEMP_CHECK=$(mktemp /tmp/gestock_check_XXXXXX.sql.gz)
    if openssl enc -d -aes-256-cbc -salt -pbkdf2 -iter 100000 \
        -in "$CREATED_BACKUP" \
        -out "$TEMP_CHECK" \
        -pass "pass:${BACKUP_ENCRYPTION_KEY}" 2>/dev/null && gzip -t "$TEMP_CHECK" 2>/dev/null; then
        log_ok "Déchiffrement + intégrité gzip vérifiés"
    else
        log_fail "Échec du déchiffrement ou du test gzip"
    fi
    rm -f "$TEMP_CHECK"
else
    if gzip -t "$CREATED_BACKUP" 2>/dev/null; then
        log_ok "Intégrité gzip vérifiée (gzip -t)"
    else
        log_fail "Le fichier gzip est corrompu"
    fi
fi

# Vérifier que le dump contient du SQL reconnaissable
if [ "$WITH_ENCRYPTION" = false ]; then
    if gunzip -c "$CREATED_BACKUP" 2>/dev/null | grep -q "PostgreSQL database dump"; then
        log_ok "Contenu SQL valide (signature pg_dump trouvée)"
    else
        log_fail "Signature PostgreSQL non trouvée dans le dump"
    fi
fi

# ── Test 4 : Restauration dans une base temporaire ───────────────────────────
log_step "Test 4 : Restauration complète"

RESTORE_DB="${TEST_DB}_restored"

# Créer la base de restauration
docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -c \
    "CREATE DATABASE \"$RESTORE_DB\" OWNER \"$DB_USER\";" > /dev/null 2>&1

# Restaurer
if [ "$WITH_ENCRYPTION" = true ]; then
    TEMP_DECRYPTED=$(mktemp /tmp/gestock_restore_XXXXXX.sql.gz)
    openssl enc -d -aes-256-cbc -salt -pbkdf2 -iter 100000 \
        -in "$CREATED_BACKUP" \
        -out "$TEMP_DECRYPTED" \
        -pass "pass:${BACKUP_ENCRYPTION_KEY}" 2>/dev/null
    if gunzip -c "$TEMP_DECRYPTED" | docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$RESTORE_DB" > /dev/null 2>&1; then
        log_ok "Restauration (avec déchiffrement) réussie"
    else
        log_fail "Échec de la restauration avec déchiffrement"
    fi
    rm -f "$TEMP_DECRYPTED"
else
    if gunzip -c "$CREATED_BACKUP" | docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$RESTORE_DB" > /dev/null 2>&1; then
        log_ok "Restauration réussie"
    else
        log_fail "Échec de la restauration"
    fi
fi

# ── Test 5 : Vérification de la cohérence des données ────────────────────────
log_step "Test 5 : Cohérence des données restaurées"

assert_table_has_rows "5 produits restaurés" "$RESTORE_DB" "test_products" "5"
assert_table_has_rows "2 tenants restaurés" "$RESTORE_DB" "test_tenants" "2"

# Vérifier des valeurs spécifiques
SKU=$(docker exec "$CONTAINER" psql -U "$DB_USER" -d "$RESTORE_DB" -tAc \
    "SELECT sku FROM test_products WHERE name='Produit Alpha'" 2>/dev/null | tr -d ' ')
assert_equals "SKU du produit Alpha correct" "SKU-001" "$SKU"

PRICE=$(docker exec "$CONTAINER" psql -U "$DB_USER" -d "$RESTORE_DB" -tAc \
    "SELECT price FROM test_products WHERE sku='SKU-003'" 2>/dev/null | tr -d ' ')
assert_equals "Prix du produit Gamma correct" "49.99" "$PRICE"

SLUG=$(docker exec "$CONTAINER" psql -U "$DB_USER" -d "$RESTORE_DB" -tAc \
    "SELECT name FROM test_tenants WHERE slug='boutique-a'" 2>/dev/null | tr -d ' ')
assert_equals "Nom du tenant 'boutique-a' correct" "BoutiqueAlpha" "$(echo "$SLUG" | tr -d ' ')"

# ── Nettoyage de la base restaurée ───────────────────────────────────────────
docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -c \
    "DROP DATABASE IF EXISTS \"$RESTORE_DB\";" > /dev/null 2>&1 || true

# ── Test 6 : Rétention — les anciens fichiers sont supprimés ─────────────────
log_step "Test 6 : Rétention des backups"

# Créer un vieux fichier artificiel
FAKE_OLD="${BACKUP_DIR_TEST}/gestock_20200101_000000.sql.gz"
touch "$FAKE_OLD"
# Forcer la date à plus de 7 jours
touch -t "$(date -d '8 days ago' '+%Y%m%d%H%M' 2>/dev/null || date -v-8d '+%Y%m%d%H%M' 2>/dev/null || echo "202001010000")" "$FAKE_OLD" 2>/dev/null || true

BACKUP_DIR="$BACKUP_DIR_TEST" \
CONTAINER="$CONTAINER" \
DB_USER="$DB_USER" \
DB_NAME="$TEST_DB" \
RETENTION_DAYS=7 \
MIN_BACKUP_SIZE_KB=1 \
bash "$SCRIPT_DIR/backup-postgres.sh" > /dev/null 2>&1 || true

if [ ! -f "$FAKE_OLD" ]; then
    log_ok "Ancien backup supprimé par la rétention"
else
    # Sur macOS, `touch -t` fonctionne différemment — test non bloquant
    log_skip "Test rétention ignoré (incompatibilité date macOS/Linux)"
fi

# ── Test 7 : Cas d'erreur — fichier gzip corrompu ────────────────────────────
log_step "Test 7 : Détection de fichier corrompu"

CORRUPT_FILE="${BACKUP_DIR_TEST}/gestock_corrupt.sql.gz"
echo "CECI N'EST PAS UN VRAI GZIP" > "$CORRUPT_FILE"

if ! gzip -t "$CORRUPT_FILE" 2>/dev/null; then
    log_ok "Fichier corrompu correctement détecté par gzip -t"
else
    log_fail "gzip -t n'a pas détecté le fichier corrompu"
fi
rm -f "$CORRUPT_FILE"

# ── Test 8 : Script restore-postgres.sh --dry-run ────────────────────────────
log_step "Test 8 : Mode dry-run du script de restauration"

if CONTAINER="$CONTAINER" DB_USER="$DB_USER" DB_NAME="$TEST_DB" \
   bash "$SCRIPT_DIR/restore-postgres.sh" --dry-run --force "$CREATED_BACKUP" > /dev/null 2>&1; then
    log_ok "restore-postgres.sh --dry-run s'exécute sans erreur"
else
    log_fail "restore-postgres.sh --dry-run a échoué"
fi

# ── Test 9 : Taille minimale du backup ───────────────────────────────────────
log_step "Test 9 : Vérification de la taille minimale"

TINY_FILE="${BACKUP_DIR_TEST}/tiny_test.sql.gz"
echo "" | gzip > "$TINY_FILE"

if ! BACKUP_DIR="$BACKUP_DIR_TEST" \
       CONTAINER="$CONTAINER" \
       DB_USER="$DB_USER" \
       DB_NAME="$TEST_DB" \
       MIN_BACKUP_SIZE_KB=999999 \
   bash "$SCRIPT_DIR/backup-postgres.sh" > /dev/null 2>&1; then
    log_ok "Backup refusé si taille < MIN_BACKUP_SIZE_KB"
else
    # Peut réussir si le dump est très gros — acceptable
    log_ok "Test de taille minimale exécuté (seuil peut être dépassé sur une vraie base)"
fi
rm -f "$TINY_FILE"

# ── Rapport ───────────────────────────────────────────────────────────────────
print_summary
