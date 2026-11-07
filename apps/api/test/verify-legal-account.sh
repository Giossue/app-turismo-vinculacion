#!/usr/bin/env bash
set -euo pipefail

# Solo usa un cluster temporal con socket privado; no lee credenciales de despliegue.
for legal_tool in initdb pg_ctl psql corepack rg; do
  command -v "$legal_tool" >/dev/null || {
    printf 'Falta la herramienta %s.\n' "$legal_tool" >&2
    exit 1
  }
done

legal_repo=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
legal_temp=$(mktemp -d /tmp/turismo-legal-account-check-XXXXXXXX)
legal_log="$legal_temp/verification.log"
cleanup_legal_cluster() {
  if [[ -f "$legal_temp/data/postmaster.pid" ]]; then
    pg_ctl -D "$legal_temp/data" -m fast -w stop >>"$legal_log" 2>&1 || true
  fi
  if [[ ${1:-0} != 0 ]]; then
    cat "$legal_log" >&2
  fi
  rm -rf -- "$legal_temp"
}
trap 'cleanup_legal_cluster $?' EXIT

initdb -D "$legal_temp/data" -A trust --no-locale -E UTF8 -U legal_account_test >"$legal_log" 2>&1
pg_ctl -D "$legal_temp/data" -l "$legal_temp/postgres.log" \
  -o "-F -k $legal_temp -h '' -p 55493" -w -t 15 start >>"$legal_log" 2>&1

export PGPASSFILE=/dev/null PGHOST="$legal_temp" PGPORT=55493 PGUSER=legal_account_test
cd "$legal_repo"
printf 'Aplicando el esquema en PostgreSQL/PostGIS temporal.\n'
while IFS= read -r legal_migration; do
  case "$legal_migration" in
    *seed*|*demo*) continue ;;
  esac
  legal_database=turismo_vinculacion_app
  if [[ "$legal_migration" == *00000000000000_initial.sql ]]; then
    legal_database=postgres
  fi
  psql -X -v ON_ERROR_STOP=1 -d "$legal_database" -f "$legal_migration" >>"$legal_log" 2>&1
done < <(rg --files database/migrations -g '*.sql' | sort)

psql -X -v ON_ERROR_STOP=1 -d turismo_vinculacion_app \
  -f database/seeds/001_guaranda_desarrollo.sql >>"$legal_log" 2>&1

printf 'Verificando aceptación legal y eliminación de cuentas.\n'
LEGAL_ACCOUNT_TEST_PGHOST="$legal_temp" \
  corepack pnpm --filter @turismo/api exec vitest run test/legal-account.integration.spec.ts

psql -X -v ON_ERROR_STOP=1 -d turismo_vinculacion_app \
  -f database/migrations/20261107_legal_acceptance_account_deletion.sql >>"$legal_log" 2>&1
printf 'Migración repetida correctamente con constancias conservadas.\n'
