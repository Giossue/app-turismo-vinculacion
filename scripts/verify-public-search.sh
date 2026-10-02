#!/usr/bin/env bash
set -euo pipefail

# A private Unix socket and disposable database keep verification independent
# from every application URL, real password file and deployment connection.
for search_tool in initdb pg_ctl psql corepack rg; do
  command -v "$search_tool" >/dev/null || {
    printf 'Falta la herramienta %s.\n' "$search_tool" >&2
    exit 1
  }
done

search_repo=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
search_temp=$(mktemp -d /tmp/turismo-public-search-check-XXXXXXXX)
search_log="$search_temp/verification.log"
cleanup_search_cluster() {
  if [[ -f "$search_temp/data/postmaster.pid" ]]; then
    pg_ctl -D "$search_temp/data" -m fast -w stop >>"$search_log" 2>&1 || true
  fi
  if [[ ${1:-0} != 0 ]]; then tail -n 50 "$search_log" >&2; fi
  rm -rf -- "$search_temp"
}
trap 'cleanup_search_cluster $?' EXIT

initdb -D "$search_temp/data" -A trust --no-locale -E UTF8 -U public_search_test >"$search_log" 2>&1
pg_ctl -D "$search_temp/data" -l "$search_temp/postgres.log" \
  -o "-F -k $search_temp -h '' -p 55493" -w -t 15 start >>"$search_log" 2>&1

touch "$search_temp/no-credentials.pass"
chmod 600 "$search_temp/no-credentials.pass"
unset PGHOSTADDR PGSERVICE PGSERVICEFILE PGOPTIONS
export PGPASSFILE="$search_temp/no-credentials.pass" PGHOST="$search_temp" PGPORT=55493 PGUSER=public_search_test
cd "$search_repo"
printf 'Verificando búsqueda en PostgreSQL/PostGIS temporal.\n'
while IFS= read -r search_migration; do
  case "$search_migration" in
    *seed*|*demo*) continue ;;
  esac
  search_database=turismo_vinculacion_app
  if [[ "$search_migration" == *00000000000000_initial.sql ]]; then search_database=postgres; fi
  psql -X -v ON_ERROR_STOP=1 -d "$search_database" -f "$search_migration" >>"$search_log" 2>&1
done < <(rg --files database/migrations -g '*.sql' | sort)

psql -X -v ON_ERROR_STOP=1 -d turismo_vinculacion_app \
  -f database/seeds/001_guaranda_desarrollo.sql >>"$search_log" 2>&1
PUBLIC_SEARCH_TEST_PGHOST="$search_temp" \
  corepack pnpm --filter @turismo/api exec vitest run test/search.integration.spec.ts
printf 'Búsqueda verificada sobre el esquema existente, con publicación, relevancia y área real.\n'
