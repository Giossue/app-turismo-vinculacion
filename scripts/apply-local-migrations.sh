#!/usr/bin/env bash
set -Eeuo pipefail

script_directory="$(cd -- "$(dirname -- "$0")" && pwd)"
project_root="$(cd -- "$script_directory/.." && pwd)"
migration_directory="${TURISMO_LOCAL_MIGRATION_DIRECTORY:-$project_root/database/migrations}"
checkpoint_name="20261002_admin_logical_deletion.sql"
fresh_database=false

fail() {
  printf '[migrations] ERROR: %s\n' "$*" >&2
  exit 1
}

if [[ "${1:-}" == "--fresh" && $# == 1 ]]; then
  fresh_database=true
elif [[ $# != 0 ]]; then
  fail "Uso: apply-local-migrations.sh [--fresh]"
fi

[[ -n "${TURISMO_LOCAL_MIGRATION_DATABASE_URL:-}" ]] || fail \
  "Configura TURISMO_LOCAL_MIGRATION_DATABASE_URL a la base local."
command -v psql >/dev/null 2>&1 || fail "No encuentro psql."
command -v sha256sum >/dev/null 2>&1 || fail "No encuentro sha256sum."
[[ -d "$migration_directory" ]] || fail "No existe el directorio de migraciones."
migration_directory="$(cd -- "$migration_directory" && pwd)"

# Las rutas se escriben como argumentos literales de psql; nunca se evalúan en shell.
quote_psql() {
  local literal="$1"
  [[ "$literal" != *$'\n'* && "$literal" != *$'\r'* ]] || fail \
    "Las rutas de migración no pueden contener saltos de línea."
  literal="${literal//\\/\\\\}"
  literal="${literal//\'/\'\'}"
  printf "'%s'" "$literal"
}

set_migration_variables() {
  local migration_path="$1"
  local migration_name="${migration_path##*/}"
  local checksum
  [[ "$migration_name" =~ ^[0-9]{8,14}_[a-zA-Z0-9_]+\.sql$ ]] || fail \
    "Nombre de migración no válido: $migration_name"
  checksum="$(sha256sum < "$migration_path")"
  checksum="${checksum%% *}"
  printf '\\set migration_name %s\n' "$(quote_psql "$migration_name")"
  printf '\\set migration_checksum %s\n' "$(quote_psql "$checksum")"
  printf '\\set migration_path %s\n' "$(quote_psql "$migration_path")"
}

shopt -s nullglob
migration_files=("$migration_directory"/*.sql)
[[ ${#migration_files[@]} != 0 ]] || fail "No hay migraciones SQL."
driver_file="$(mktemp)"
trap 'rm -f -- "$driver_file"' EXIT

{
  cat <<'SQL'
-- Una sesión mantiene el bloqueo incluso cuando las migraciones hacen COMMIT.
SELECT pg_advisory_lock(hashtext('turismo-local-schema-migrations')) \g /dev/null
CREATE TABLE IF NOT EXISTS public.local_schema_migrations (
  filename text PRIMARY KEY,
  checksum char(64) NOT NULL,
  origin text NOT NULL CHECK (origin IN ('EXECUTED', 'CHECKPOINT', 'BOOTSTRAP')),
  applied_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
SELECT NOT EXISTS (SELECT 1 FROM public.local_schema_migrations) AS empty_ledger \gset
\if :empty_ledger
SQL
  if [[ "$fresh_database" == false ]]; then
    [[ -f "$migration_directory/$checkpoint_name" ]] || fail \
      "No existe la migración del checkpoint: $checkpoint_name"
    printf '\\i %s\n' "$(quote_psql "$script_directory/local-migration-checkpoint.sql")"
    printf '\\echo [migrations] Registrando el checkpoint de eliminación ya verificado.\n'
    printf 'BEGIN;\n'
    for migration_file in "${migration_files[@]}"; do
      migration_name="${migration_file##*/}"
      [[ "$migration_name" > "$checkpoint_name" ]] && continue
      set_migration_variables "$migration_file"
      cat <<'SQL'
INSERT INTO public.local_schema_migrations (filename, checksum, origin)
VALUES (:'migration_name', :'migration_checksum', 'CHECKPOINT');
SQL
    done
    printf 'COMMIT;\n'
  elif [[ -f "$migration_directory/00000000000000_initial.sql" ]]; then
    set_migration_variables "$migration_directory/00000000000000_initial.sql"
    cat <<'SQL'
INSERT INTO public.local_schema_migrations (filename, checksum, origin)
VALUES (:'migration_name', :'migration_checksum', 'BOOTSTRAP');
SQL
  fi
  printf '\\endif\n'

  for migration_file in "${migration_files[@]}"; do
    migration_name="${migration_file##*/}"
    set_migration_variables "$migration_file"
    cat <<'SQL'
SELECT EXISTS (
  SELECT 1 FROM public.local_schema_migrations
   WHERE filename = :'migration_name' AND checksum <> :'migration_checksum'
) AS migration_changed \gset
\if :migration_changed
\echo [migrations] El archivo aplicado cambió: :migration_name
DO $$ BEGIN
  RAISE EXCEPTION 'Una migración aplicada cambió; conserva su archivo y crea una migración nueva.';
END $$;
\endif
SQL
    [[ "$migration_name" == "00000000000000_initial.sql" ]] && continue
    cat <<'SQL'
SELECT NOT EXISTS (
  SELECT 1 FROM public.local_schema_migrations WHERE filename = :'migration_name'
) AS migration_pending \gset
\if :migration_pending
\echo [migrations] Aplicando :migration_name
\i :migration_path
INSERT INTO public.local_schema_migrations (filename, checksum, origin)
VALUES (:'migration_name', :'migration_checksum', 'EXECUTED');
\endif
SQL
  done
} > "$driver_file"

psql "$TURISMO_LOCAL_MIGRATION_DATABASE_URL" -X -q -v ON_ERROR_STOP=1 -f "$driver_file"
