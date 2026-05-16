#!/bin/bash
# setup-ssl.sh — Bootstrap Let's Encrypt SSL pour GesTock
# À exécuter UNE FOIS sur le VPS après le premier déploiement
# Usage: bash setup-ssl.sh <domain>
# Exemple: bash setup-ssl.sh gestock.allsite.cloud

set -euo pipefail

DOMAIN="${1:-}"
if [ -z "$DOMAIN" ]; then
  echo "Usage: $0 <domain>"
  echo "Exemple: $0 gestock.allsite.cloud"
  exit 1
fi

echo "=== Installation certbot + plugin nginx ==="
sudo apt-get update -qq
sudo apt-get install -y -qq certbot python3-certbot-nginx

echo "=== Vérifier que nginx écoute sur le port 80 pour $DOMAIN ==="
echo "Le fichier nginx/nginx.conf doit avoir:"
echo "  server_name $DOMAIN;"
echo "  location /.well-known/acme-challenge/ { root /var/www/html; }"

echo ""
echo "=== Obtenir le certificat SSL (non-interactif) ==="
sudo certbot --nginx \
  --domain "$DOMAIN" \
  --non-interactive \
  --agree-tos \
  --email admin@"$DOMAIN" \
  --redirect

echo ""
echo "=== Vérifier le renouvellement automatique ==="
sudo certbot renew --dry-run

echo ""
echo "=== Vérifier la configuration nginx ==="
sudo nginx -t

echo ""
echo "=== Recharger nginx ==="
sudo systemctl reload nginx

echo ""
echo "✅ SSL configuré pour $DOMAIN"
echo "   - Certificat: /etc/letsencrypt/live/$DOMAIN/"
echo "   - Auto-renouvellement: 2x/jour via systemd timer"
echo "   - Redirection HTTP → HTTPS active"
