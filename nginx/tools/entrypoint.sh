#!/bin/sh
set -e

CERT_DIR="/etc/nginx/certs"
CRT="$CERT_DIR/selfsigned.crt"
KEY="$CERT_DIR/selfsigned.key"

mkdir -p "$CERT_DIR"

if [ ! -f "$CRT" ] || [ ! -f "$KEY" ]; then
  echo "[nginx] Generating self-signed certificate (dev)..."
  openssl req -x509 -nodes -days 365 \
    -newkey rsa:2048 \
    -keyout "$KEY" \
    -out "$CRT" \
    -subj "/C=FR/ST=IDF/L=Paris/O=42Transcendence/OU=Ludo/CN=localhost"
fi

exec nginx -g "daemon off;"
