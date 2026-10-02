#!/usr/bin/env bash
set -Eeuo pipefail

script_directory="$(cd -- "$(dirname -- "$0")" && pwd)"
project_root="$(cd -- "$script_directory/.." && pwd)"
[[ -n "${TURISMO_MIGRATION_TEST_DATABASE_URL:-}" ]] || {
  printf 'Configura TURISMO_MIGRATION_TEST_DATABASE_URL a una base temporal vacía.\n' >&2
  exit 1
}
test_psql=(psql "$TURISMO_MIGRATION_TEST_DATABASE_URL" -X -q -v ON_ERROR_STOP=1)
empty_database="$("${test_psql[@]}" -Atc "SELECT NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public')")"
[[ "$empty_database" == t ]] || {
  printf 'La prueba requiere una base temporal vacía; no se modificó esta base.\n' >&2
  exit 1
}

test_directory="$(mktemp -d)"
trap 'rm -rf -- "$test_directory"' EXIT
migration_directory="$test_directory/migrations space'quote"
mkdir -- "$migration_directory"

runner() {
  TURISMO_LOCAL_MIGRATION_DATABASE_URL="$TURISMO_MIGRATION_TEST_DATABASE_URL" \
    TURISMO_LOCAL_MIGRATION_DIRECTORY="$migration_directory" \
    bash "$script_directory/apply-local-migrations.sh" "$@" > "$test_directory/runner.log" 2>&1
}

assert_query() {
  local actual
  actual="$("${test_psql[@]}" -Atc "$1")"
  [[ "$actual" == "$2" ]] || {
    printf 'Consulta de prueba inesperada: %s; recibido: %s; esperado: %s\n' "$1" "$actual" "$2" >&2
    exit 1
  }
}

expect_failure() {
  if runner "$@"; then
    printf 'Se esperaba rechazar el arranque.\n' >&2
    exit 1
  fi
}

cat > "$migration_directory/20260901_test_schema.sql" <<'SQL'
CREATE TABLE tipos_facilidad (id bigint PRIMARY KEY, activo boolean NOT NULL);
CREATE TABLE centros_turisticos (id bigint PRIMARY KEY, activo boolean NOT NULL);
CREATE TABLE establecimientos_turisticos (id bigint PRIMARY KEY, activo boolean NOT NULL);
CREATE TABLE tipos_accesibilidad (id bigint PRIMARY KEY, activo boolean NOT NULL);
CREATE TABLE actividades_turisticas (id bigint PRIMARY KEY, activo boolean NOT NULL);
CREATE TABLE catalogo_catastro_clasificaciones (id bigint PRIMARY KEY, activo boolean NOT NULL);
CREATE TABLE catalogo_catastro_categorias (id bigint PRIMARY KEY, activo boolean NOT NULL);
CREATE TABLE opiniones (usuario_id bigint, centro_turistico_id bigint, punto_interes_id bigint, estado_moderacion text);
CREATE TABLE auditoria_catalogos (accion text CHECK (accion IN ('CREAR')));
CREATE TABLE auditoria_fichas (accion text CHECK (accion IN ('CREAR')));
CREATE TABLE moderaciones_opinion (accion text CHECK (accion IN ('APROBAR')));
INSERT INTO tipos_facilidad VALUES (1, TRUE);
SQL

runner --fresh
assert_query 'SELECT COUNT(*) FROM local_schema_migrations' 1
cp -- "$project_root/database/migrations/20261002_admin_logical_deletion.sql" "$migration_directory/"
runner
"${test_psql[@]}" <<'SQL'
UPDATE tipos_facilidad SET activo = FALSE, eliminado_at = CURRENT_TIMESTAMP WHERE id = 1;
INSERT INTO auditoria_catalogos (accion) VALUES ('ELIMINAR');
SQL
runner
assert_query 'SELECT COUNT(*) FROM local_schema_migrations' 2
assert_query 'SELECT activo FROM tipos_facilidad WHERE id = 1' f
assert_query "SELECT COUNT(*) FROM auditoria_catalogos WHERE accion = 'ELIMINAR'" 1

pending_file="$migration_directory/20261003_test_pending.sql"
cat > "$pending_file" <<'SQL'
BEGIN;
INSERT INTO tipos_facilidad (id, activo) VALUES (2, TRUE);
SELECT 1 / 0;
COMMIT;
SQL
expect_failure
assert_query "SELECT COUNT(*) FROM local_schema_migrations WHERE filename = '20261003_test_pending.sql'" 0
assert_query 'SELECT COUNT(*) FROM tipos_facilidad WHERE id = 2' 0
cat > "$pending_file" <<'SQL'
INSERT INTO tipos_facilidad (id, activo) VALUES (2, TRUE);
SQL
runner
assert_query 'SELECT COUNT(*) FROM local_schema_migrations' 3
printf '%s\n' '-- changed after applying' >> "$pending_file"
expect_failure
assert_query 'SELECT COUNT(*) FROM tipos_facilidad' 2
rm -- "$pending_file"

# Una base antigua no se adopta con un checkpoint incompleto.
"${test_psql[@]}" <<'SQL'
DROP TABLE local_schema_migrations;
ALTER TABLE tipos_facilidad DROP CONSTRAINT tipos_facilidad_eliminado_inactivo_check;
SQL
expect_failure
assert_query 'SELECT COUNT(*) FROM local_schema_migrations' 0
assert_query 'SELECT activo FROM tipos_facilidad WHERE id = 1' f
"${test_psql[@]}" -f "$migration_directory/20261002_admin_logical_deletion.sql" > /dev/null 2>&1
runner
assert_query "SELECT COUNT(*) FROM local_schema_migrations WHERE origin = 'CHECKPOINT'" 2
assert_query 'SELECT activo FROM tipos_facilidad WHERE id = 1' f
cat > "$pending_file" <<'SQL'
INSERT INTO tipos_facilidad (id, activo) VALUES (3, TRUE);
SQL
runner
assert_query "SELECT COUNT(*) FROM local_schema_migrations WHERE origin = 'EXECUTED'" 1
assert_query 'SELECT COUNT(*) FROM tipos_facilidad WHERE id = 3' 1
runner
assert_query 'SELECT COUNT(*) FROM tipos_facilidad' 3
printf 'Pruebas de migraciones locales completas: pendientes, reinicio, rollback, checksum y checkpoint.\n'
