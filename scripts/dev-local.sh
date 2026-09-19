#!/usr/bin/env bash
set -Eeuo pipefail

script_directory="$(cd -- "$(dirname -- "$0")" && pwd)"
project_root="$(cd -- "$script_directory/.." && pwd)"
web_root="${TURISMO_WEB_ROOT:-$(cd "$project_root/../web-turismo-admin" && pwd)}"
compose_file="$project_root/infra/docker/compose.local.yml"
postgres_container="turismo-vinculacion-postgres"
postgres_port="${TURISMO_POSTGRES_PORT:-55433}"
api_port="${API_PORT:-3000}"
web_port=3002
database_name="turismo_vinculacion_app"
database_url="postgresql://postgres@127.0.0.1:${postgres_port}/${database_name}"
admin_database_url="postgresql://postgres@127.0.0.1:${postgres_port}/postgres"
api_base_url="http://localhost:${api_port}/api/v1"
api_health_url="${api_base_url}/health"
web_url="http://localhost:${web_port}"

children=()
database_started_by_script=false

log() {
  printf '[dev-local] %s\n' "$*"
}

fail() {
  printf '[dev-local] ERROR: %s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "No encuentro el comando requerido: $1"
}

port_in_use() {
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$1" -sTCP:LISTEN 2>/dev/null | tail -n +2 | grep -q .
    return
  fi

  return 1
}

cleanup() {
  local exit_code=$?
  trap - EXIT INT TERM HUP

  for child_pid in "${children[@]:-}"; do
    kill "$child_pid" 2>/dev/null || true
  done

  for child_pid in "${children[@]:-}"; do
    wait "$child_pid" 2>/dev/null || true
  done

  if [[ "$database_started_by_script" == true ]]; then
    log "Deteniendo PostgreSQL local..."
    "${compose_command[@]}" stop postgres >/dev/null 2>&1 || true
  fi

  exit "$exit_code"
}

trap cleanup EXIT INT TERM HUP

require_command corepack
require_command psql
require_command curl
require_command bun

if [[ ! -d "$web_root" ]]; then
  fail "No encuentro la web admin en $web_root. Usa TURISMO_WEB_ROOT para indicar otra ruta."
fi

if podman compose version >/dev/null 2>&1; then
  compose_command=(podman compose -f "$compose_file")
  container_engine=podman
elif docker compose version >/dev/null 2>&1; then
  compose_command=(docker compose -f "$compose_file")
  container_engine=docker
else
  fail "Necesito Podman Compose o Docker Compose para levantar PostgreSQL."
fi

if port_in_use "$api_port"; then
  fail "El puerto $api_port ya está ocupado. Cierra la API anterior antes de continuar."
fi

if port_in_use "$web_port"; then
  fail "El puerto $web_port ya está ocupado. Cierra la web admin anterior antes de continuar."
fi

database_status="$("$container_engine" inspect -f '{{.State.Status}}' "$postgres_container" 2>/dev/null || true)"
if [[ "$database_status" != "running" ]]; then
  database_started_by_script=true
fi

log "Levantando PostgreSQL/PostGIS..."
if [[ "$database_status" == "exited" || "$database_status" == "created" ]]; then
  "$container_engine" start "$postgres_container" >/dev/null
else
  "${compose_command[@]}" up -d postgres
fi

log "Esperando PostgreSQL en 127.0.0.1:$postgres_port..."
database_ready=false
for _ in {1..60}; do
  if psql "$admin_database_url" -X -Atqc "SELECT 1" >/dev/null 2>&1; then
    database_ready=true
    break
  fi
  sleep 1
done
[[ "$database_ready" == true ]] || fail "PostgreSQL no respondió dentro del tiempo esperado."

database_exists="$(psql "$admin_database_url" -X -Atqc "SELECT 1 FROM pg_database WHERE datname = '$database_name'")"
if [[ -z "$database_exists" ]]; then
  log "Creando el esquema base..."
  psql "$admin_database_url" -X -v ON_ERROR_STOP=1 \
    -f "$project_root/database/migrations/00000000000000_initial.sql"
else
  schema_exists="$(psql "$database_url" -X -Atqc "SELECT to_regclass('public.usuarios')")"
  [[ "$schema_exists" == "usuarios" ]] || fail \
    "La base $database_name existe, pero el esquema base está incompleto."
  log "Esquema base ya existente; no se vuelve a ejecutar."
fi

log "Aplicando migraciones y datos demo..."
for migration_file in "$project_root"/database/migrations/*.sql; do
  migration_name="$(basename "$migration_file")"
  [[ "$migration_name" == "00000000000000_initial.sql" ]] && continue
  psql "$database_url" -X -v ON_ERROR_STOP=1 -f "$migration_file" >/dev/null
done
bash "$project_root/scripts/seed-guaranda-demo-media.sh" >/dev/null

if [[ ! -x "$project_root/node_modules/.bin/tsx" ]]; then
  log "Instalando dependencias del monorepo..."
  (cd "$project_root" && corepack pnpm install)
fi

if [[ ! -x "$web_root/node_modules/.bin/next" ]]; then
  log "Instalando dependencias de la web admin..."
  (cd "$web_root" && bun install)
fi

log "Iniciando API en $api_base_url..."
(
  cd "$project_root"
  DATABASE_URL="$database_url" \
  API_PORT="$api_port" \
  ADMIN_WEB_ORIGIN="$web_url" \
  corepack pnpm --filter @turismo/api dev
) &
api_pid=$!
children+=("$api_pid")

log "Esperando que la API responda..."
api_ready=false
for _ in {1..60}; do
  if curl --silent --show-error --fail --max-time 2 "$api_health_url" >/dev/null 2>&1; then
    api_ready=true
    break
  fi
  if ! kill -0 "$api_pid" 2>/dev/null; then
    wait "$api_pid" 2>/dev/null || true
    fail "La API terminó antes de estar disponible."
  fi
  sleep 1
done
[[ "$api_ready" == true ]] || fail "La API no respondió dentro del tiempo esperado."

if command -v adb >/dev/null 2>&1 && adb get-state >/dev/null 2>&1; then
  adb reverse tcp:"$api_port" tcp:"$api_port" >/dev/null
  log "Dispositivo Android conectado: API expuesta por adb reverse en el puerto $api_port."
fi

log "Iniciando web admin en $web_url/admin..."
(
  cd "$web_root"
  TURISMO_API_URL="$api_base_url" \
  NEXT_PUBLIC_TURISMO_API_URL="$api_base_url" \
  bun run dev
) &
web_pid=$!
children+=("$web_pid")

cat <<EOF

Turismo Vinculación está ejecutándose:

  Admin:    $web_url/admin
  API:      $api_base_url
  API docs: http://localhost:$api_port/api/docs
  PostgreSQL: 127.0.0.1:$postgres_port/$database_name

Pulsa Ctrl+C para detener API y admin. Para detener también PostgreSQL, ejecuta en otra
terminal: corepack pnpm dev:local:stop
EOF

set +e
wait -n "${children[@]}"
exit_code=$?
set -e
exit "$exit_code"
