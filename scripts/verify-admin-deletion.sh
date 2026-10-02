#!/usr/bin/env bash
set -euo pipefail

# Solo usa un cluster temporal con socket privado; no lee credenciales de despliegue.
for deletion_tool in initdb pg_ctl psql corepack rg; do
  command -v "$deletion_tool" >/dev/null || {
    printf 'Falta la herramienta %s.\n' "$deletion_tool" >&2
    exit 1
  }
done

deletion_repo=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
deletion_temp=$(mktemp -d /tmp/turismo-admin-delete-check-XXXXXXXX)
deletion_log="$deletion_temp/verification.log"
cleanup_deletion_cluster() {
  if [[ -f "$deletion_temp/data/postmaster.pid" ]]; then
    pg_ctl -D "$deletion_temp/data" -m fast -w stop >>"$deletion_log" 2>&1 || true
  fi
  if [[ ${1:-0} != 0 ]]; then
    cat "$deletion_log" >&2
  fi
  rm -rf -- "$deletion_temp"
}
trap 'cleanup_deletion_cluster $?' EXIT

initdb -D "$deletion_temp/data" -A trust --no-locale -E UTF8 -U admin_delete_test >"$deletion_log" 2>&1
pg_ctl -D "$deletion_temp/data" -l "$deletion_temp/postgres.log" \
  -o "-F -k $deletion_temp -h '' -p 55492" -w -t 15 start >>"$deletion_log" 2>&1

export PGPASSFILE=/dev/null PGHOST="$deletion_temp" PGPORT=55492 PGUSER=admin_delete_test
cd "$deletion_repo"
printf 'Verificando esquema en PostgreSQL/PostGIS temporal.\n'
while IFS= read -r deletion_migration; do
  case "$deletion_migration" in
    *seed*|*demo*) continue ;;
  esac
  deletion_database=turismo_vinculacion_app
  if [[ "$deletion_migration" == *00000000000000_initial.sql ]]; then
    deletion_database=postgres
  fi
  psql -X -v ON_ERROR_STOP=1 -d "$deletion_database" -f "$deletion_migration" >>"$deletion_log" 2>&1
done < <(rg --files database/migrations -g '*.sql' | sort)

psql -X -v ON_ERROR_STOP=1 -d turismo_vinculacion_app \
  -f database/seeds/001_guaranda_desarrollo.sql >>"$deletion_log" 2>&1
printf 'Verificando eliminación y conservación del historial.\n'
ADMIN_DELETION_TEST_PGHOST="$deletion_temp" \
  corepack pnpm --filter @turismo/api exec vitest run test/admin-deletion.integration.spec.ts

psql -X -v ON_ERROR_STOP=1 -d turismo_vinculacion_app \
  -f database/migrations/20261002_admin_logical_deletion.sql >>"$deletion_log" 2>&1
printf 'Migración repetida correctamente con datos y auditoría conservados.\n'
