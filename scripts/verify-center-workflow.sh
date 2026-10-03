#!/usr/bin/env bash
set -euo pipefail

# Private disposable cluster only: no application URL or real password file.
for workflow_tool in initdb pg_ctl psql corepack rg; do
  command -v "$workflow_tool" >/dev/null || {
    printf 'Falta la herramienta %s.\n' "$workflow_tool" >&2
    exit 1
  }
done

workflow_repo=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
workflow_temp=$(mktemp -d /tmp/turismo-center-workflow-check-XXXXXXXX)
workflow_log="$workflow_temp/verification.log"
workflow_migration="$workflow_repo/database/migrations/20261003_center_three_state_workflow.sql"
cleanup_workflow_cluster() {
  if [[ -f "$workflow_temp/data/postmaster.pid" ]]; then
    pg_ctl -D "$workflow_temp/data" -m fast -w -t 15 stop >>"$workflow_log" 2>&1 || true
  fi
  if [[ ${1:-0} != 0 ]]; then
    tail -n 80 "$workflow_log" >&2
  fi
  rm -rf -- "$workflow_temp"
}
trap 'cleanup_workflow_cluster $?' EXIT

initdb -D "$workflow_temp/data" -A trust --no-locale -E UTF8 -U center_workflow_test >"$workflow_log" 2>&1
pg_ctl -D "$workflow_temp/data" -l "$workflow_temp/postgres.log" \
  -o "-F -k $workflow_temp -h '' -p 55493" -w -t 15 start >>"$workflow_log" 2>&1

unset PGSERVICE PGHOSTADDR PGOPTIONS
: > "$workflow_temp/no-passwords"
chmod 600 "$workflow_temp/no-passwords"
export PGPASSFILE="$workflow_temp/no-passwords" PGSERVICEFILE=/dev/null PGPASSWORD=
export PGHOST="$workflow_temp" PGPORT=55493 PGUSER=center_workflow_test
cd "$workflow_repo"
workflow_target=$(psql -X -At -v ON_ERROR_STOP=1 -d postgres \
  -c "SELECT current_user || ':' || COALESCE(inet_server_addr()::text, 'unix')")
[[ "$workflow_target" == 'center_workflow_test:unix' ]] || {
  printf 'El destino de pruebas no es el cluster privado.\n' >&2
  exit 1
}

bootstrap_workflow_schema() {
  while IFS= read -r workflow_file; do
    case "$workflow_file" in
      *seed*|*demo*|*20261003_center_three_state_workflow.sql) continue ;;
    esac
    workflow_database=turismo_vinculacion_app
    if [[ "$workflow_file" == *00000000000000_initial.sql ]]; then
      workflow_database=postgres
    fi
    psql -X -v ON_ERROR_STOP=1 -d "$workflow_database" -f "$workflow_file" >>"$workflow_log" 2>&1
  done < <(rg --files database/migrations -g '*.sql' | sort)
}

printf 'Verificando migración sobre esquema vacío PostgreSQL/PostGIS.\n'
bootstrap_workflow_schema
psql -X -v ON_ERROR_STOP=1 -d turismo_vinculacion_app -f "$workflow_migration" >>"$workflow_log" 2>&1
psql -X -v ON_ERROR_STOP=1 -d turismo_vinculacion_app -f "$workflow_migration" >>"$workflow_log" 2>&1
workflow_states=$(psql -X -At -v ON_ERROR_STOP=1 -d turismo_vinculacion_app \
  -c "SELECT string_agg(codigo, ',' ORDER BY codigo) FROM estados_resenia WHERE activo")
[[ "$workflow_states" == 'BORRADOR,EN_REVISION,PUBLICADO' ]] || exit 1

# This database exists only in the cluster created above; rebuild its prior schema.
psql -X -v ON_ERROR_STOP=1 -d postgres \
  -c 'DROP DATABASE turismo_vinculacion_app' >>"$workflow_log" 2>&1
bootstrap_workflow_schema
psql -X -v ON_ERROR_STOP=1 -d turismo_vinculacion_app \
  -f database/seeds/001_guaranda_desarrollo.sql >>"$workflow_log" 2>&1

printf 'Preparando estados e historial anteriores en el cluster privado.\n'
CENTER_WORKFLOW_TEST_PGHOST="$workflow_temp" CENTER_WORKFLOW_TEST_PHASE=prepare \
  corepack pnpm --filter @turismo/api exec vitest run test/admin-center-workflow.integration.spec.ts
psql -X -v ON_ERROR_STOP=1 -d turismo_vinculacion_app -f "$workflow_migration" >>"$workflow_log" 2>&1

printf 'Verificando publicación, devolución, concurrencia y conservación de historial.\n'
CENTER_WORKFLOW_TEST_PGHOST="$workflow_temp" CENTER_WORKFLOW_TEST_PHASE=migrated \
  corepack pnpm --filter @turismo/api exec vitest run test/admin-center-workflow.integration.spec.ts
printf 'Flujo y migración verificados; cluster temporal eliminado al salir.\n'
