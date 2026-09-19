#!/usr/bin/env bash
set -Eeuo pipefail

for port in 3000 3002; do
  pids="$(lsof -t -nP -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    echo "Deteniendo procesos del proyecto en el puerto $port..."
    kill $pids 2>/dev/null || true
  fi
done

if podman container exists turismo-vinculacion-postgres 2>/dev/null; then
  echo "Deteniendo PostgreSQL local..."
  podman stop turismo-vinculacion-postgres >/dev/null || true
elif docker container inspect turismo-vinculacion-postgres >/dev/null 2>&1; then
  echo "Deteniendo PostgreSQL local..."
  docker stop turismo-vinculacion-postgres >/dev/null || true
fi

echo "Entorno local detenido. El volumen de PostgreSQL se conserva."
