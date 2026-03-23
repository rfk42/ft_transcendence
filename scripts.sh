#!/usr/bin/env bash
set -e

docker compose up -d --build

echo "Waiting for healthy containers..."
for i in {1..120}; do
  ok=1
  for c in postgres backend frontend nginx; do
    st="$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' "$c" 2>/dev/null || echo missing)"
    if [[ "$st" != "healthy" ]]; then ok=0; fi
  done
  if [[ "$ok" -eq 1 ]]; then
    echo "✅ All containers are healthy"
    break
  fi
  sleep 1
  if [[ "$i" -eq 120 ]]; then
    echo "❌ Timeout. Current status:"
    docker compose ps
    exit 1
  fi
done

echo "Runtime checks through Nginx:"
curl -kfsS https://localhost:8443/ >/dev/null && echo "✅ Front OK" || (echo "❌ Front FAIL" && exit 1)
curl -kfsS https://localhost:8443/api/ping >/dev/null && echo "✅ API OK" || (echo "❌ API FAIL" && exit 1)

docker compose ps
echo "✅ Everything UP and working"