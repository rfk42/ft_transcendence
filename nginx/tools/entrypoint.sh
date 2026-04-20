#!/bin/sh
set -e

CERT_DIR="/etc/nginx/certs"
CRT="$CERT_DIR/selfsigned.crt"
KEY="$CERT_DIR/selfsigned.key"
PRISMA_HTPASSWD="/etc/nginx/.prisma_htpasswd"

PRISMA_STUDIO_USER="${PRISMA_STUDIO_USER:-prisma}"
PRISMA_STUDIO_PASSWORD="${PRISMA_STUDIO_PASSWORD:-mdp}"

mkdir -p "$CERT_DIR"

if [ ! -f "$CRT" ] || [ ! -f "$KEY" ]; then
  echo "[nginx] Generating self-signed certificate (dev)..."
  openssl req -x509 -nodes -days 365 \
    -newkey rsa:2048 \
    -keyout "$KEY" \
    -out "$CRT" \
    -subj "/C=FR/ST=IDF/L=Paris/O=42Transcendence/OU=Ludo/CN=localhost"
fi

PRISMA_HASH="$(openssl passwd -apr1 "$PRISMA_STUDIO_PASSWORD")"
printf "%s:%s\n" "$PRISMA_STUDIO_USER" "$PRISMA_HASH" > "$PRISMA_HTPASSWD"
# Nginx workers must be able to read this file, otherwise requests return 500.
chmod 644 "$PRISMA_HTPASSWD"

exec nginx -g "daemon off;"
