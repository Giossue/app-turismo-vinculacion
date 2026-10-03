#!/usr/bin/env bash
set -euo pipefail

# Only a disposable PostgreSQL cluster; no application environment or real credentials.
for navigation_tool in initdb pg_ctl psql corepack; do
  command -v "$navigation_tool" >/dev/null || { printf 'Falta %s.\n' "$navigation_tool" >&2; exit 1; }
done
navigation_repo=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
navigation_temp=$(mktemp -d /tmp/turismo-admin-navigation-check-XXXXXXXX)
navigation_log="$navigation_temp/verification.log"
cleanup_navigation_cluster() {
  if [[ -f "$navigation_temp/data/postmaster.pid" ]]; then
    pg_ctl -D "$navigation_temp/data" -m fast -w -t 15 stop >>"$navigation_log" 2>&1 || true
  fi
  if [[ ${1:-0} != 0 ]]; then tail -n 80 "$navigation_log" >&2; fi
  rm -rf -- "$navigation_temp"
}
trap 'cleanup_navigation_cluster $?' EXIT
initdb -D "$navigation_temp/data" -A trust --no-locale -E UTF8 -U admin_navigation_test >"$navigation_log" 2>&1
pg_ctl -D "$navigation_temp/data" -l "$navigation_temp/postgres.log" \
  -o "-F -k $navigation_temp -h '' -p 55495" -w -t 15 start >>"$navigation_log" 2>&1
unset PGSERVICE PGHOSTADDR PGOPTIONS
: > "$navigation_temp/no-passwords"
chmod 600 "$navigation_temp/no-passwords"
export PGPASSFILE="$navigation_temp/no-passwords" PGSERVICEFILE=/dev/null PGPASSWORD=
export PGHOST="$navigation_temp" PGPORT=55495 PGUSER=admin_navigation_test
navigation_target=$(psql -X -At -v ON_ERROR_STOP=1 -d postgres \
  -c "SELECT current_user || ':' || COALESCE(inet_server_addr()::text, 'unix')")
[[ "$navigation_target" == 'admin_navigation_test:unix' ]] || exit 1
psql -X -v ON_ERROR_STOP=1 -d postgres -c 'CREATE DATABASE admin_navigation_test' >>"$navigation_log" 2>&1
cd "$navigation_repo"
ADMIN_NAVIGATION_TEST_PGHOST="$navigation_temp" \
  corepack pnpm --filter @turismo/api exec vitest run \
    test/admin-navigation.spec.ts test/admin-navigation.integration.spec.ts
