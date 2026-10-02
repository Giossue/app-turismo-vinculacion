#!/usr/bin/env bash
set -euo pipefail

# Todas las mutaciones ocurren en un cluster temporal sin TCP ni credenciales remotas.
for locality_tool in initdb pg_ctl psql rg python3; do
  command -v "$locality_tool" >/dev/null || {
    printf 'Falta la herramienta %s.\n' "$locality_tool" >&2
    exit 1
  }
done

locality_repo=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
locality_temp=$(mktemp -d /tmp/turismo-national-localities-XXXXXXXX)
locality_log="$locality_temp/verification.log"
cleanup_locality_cluster() {
  if [[ -f "$locality_temp/data/postmaster.pid" ]]; then
    pg_ctl -D "$locality_temp/data" -m fast -w stop >>"$locality_log" 2>&1 || true
  fi
  if [[ ${1:-0} != 0 ]]; then
    cat "$locality_log" >&2
  fi
  rm -rf -- "$locality_temp"
}
trap 'cleanup_locality_cluster $?' EXIT

cd "$locality_repo"
python3 scripts/generate-national-localities-migration.py --output "$locality_temp/generated.sql" >>"$locality_log" 2>&1
cmp "$locality_temp/generated.sql" database/migrations/20261002_seed_national_localities.sql

initdb -D "$locality_temp/data" -A trust --no-locale -E UTF8 -U locality_test >"$locality_log" 2>&1
pg_ctl -D "$locality_temp/data" -l "$locality_temp/postgres.log" \
  -o "-F -k $locality_temp -h '' -p 55493" -w -t 15 start >>"$locality_log" 2>&1
export PGPASSFILE=/dev/null PGHOST="$locality_temp" PGPORT=55493 PGUSER=locality_test

psql -X -v ON_ERROR_STOP=1 -d postgres -f turismo_vinculacion_app.sql >>"$locality_log" 2>&1
psql -X -v ON_ERROR_STOP=1 -d turismo_vinculacion_app \
  -f database/migrations/20260920_seed_xlsm_fixed_catalogs.sql >>"$locality_log" 2>&1
psql -X -v ON_ERROR_STOP=1 -d postgres \
  -c 'CREATE DATABASE locality_missing_dpa TEMPLATE turismo_vinculacion_app' >>"$locality_log" 2>&1

# Caso previo representativo: localidad georreferenciada, inactiva con nombre en
# mayúsculas y espacios, y registro operativo ajeno a la fuente oficial.
psql -X -v ON_ERROR_STOP=1 -d turismo_vinculacion_app >>"$locality_log" 2>&1 <<'SQL'
INSERT INTO localidades (canton_id,nombre,tipo_localidad,latitud,longitud)
SELECT canton.id,'Guaranda','CIUDAD',-1.59263,-79.00098
FROM cantones canton JOIN provincias province ON province.id=canton.provincia_id
WHERE province.codigo_dpa='02' AND canton.codigo_cton='01';
INSERT INTO localidades (canton_id,nombre,tipo_localidad,activo)
SELECT canton.id,' QUITO ','CIUDAD',false
FROM cantones canton JOIN provincias province ON province.id=canton.provincia_id
WHERE province.codigo_dpa='17' AND canton.codigo_cton='01';
INSERT INTO localidades (canton_id,nombre,tipo_localidad)
SELECT canton.id,'Localidad operativa de prueba','POBLADO'
FROM cantones canton JOIN provincias province ON province.id=canton.provincia_id
WHERE province.codigo_dpa='02' AND canton.codigo_cton='01';
CREATE TABLE locality_before AS SELECT * FROM localidades;
CREATE TABLE parishes_before AS SELECT * FROM parroquias;
CREATE TABLE cantons_before AS SELECT * FROM cantones;
SQL

psql -X -v ON_ERROR_STOP=1 -d turismo_vinculacion_app \
  -f database/migrations/20261002_seed_national_localities.sql >>"$locality_log" 2>&1
psql -X -v ON_ERROR_STOP=1 -d turismo_vinculacion_app >>"$locality_log" 2>&1 <<'SQL'
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM localidades) <> 1047 THEN
    RAISE EXCEPTION 'Cobertura nacional incompleta o localidades existentes duplicadas';
  END IF;
  IF (SELECT COUNT(*) FROM localidades WHERE tipo_localidad='CIUDAD') <> 222 OR
     (SELECT COUNT(*) FROM localidades WHERE tipo_localidad='POBLADO') <> 825 THEN
    RAISE EXCEPTION 'Clasificación incorrecta de cabeceras/poblados';
  END IF;
  IF EXISTS (SELECT * FROM locality_before EXCEPT SELECT * FROM localidades) OR
     EXISTS (SELECT * FROM parishes_before EXCEPT SELECT * FROM parroquias) OR
     EXISTS (SELECT * FROM cantons_before EXCEPT SELECT * FROM cantones) THEN
    RAISE EXCEPTION 'La migración modificó un dato histórico';
  END IF;
  IF (SELECT COUNT(*) FROM localidades WHERE latitud IS NOT NULL OR longitud IS NOT NULL OR ubicacion IS NOT NULL) <> 1 THEN
    RAISE EXCEPTION 'La migración inventó posiciones';
  END IF;
  IF EXISTS (SELECT 1 FROM localidades l JOIN cantones c ON c.id=l.canton_id
    JOIN provincias p ON p.id=c.provincia_id WHERE p.codigo_dpa='90') THEN
    RAISE EXCEPTION 'Las zonas sin delimitación entraron al catálogo';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM localidades l JOIN cantones c ON c.id=l.canton_id
    JOIN provincias p ON p.id=c.provincia_id
    WHERE p.codigo_dpa='17' AND c.codigo_cton='05' AND l.nombre='Sangolquí') OR
     NOT EXISTS (SELECT 1 FROM localidades l JOIN cantones c ON c.id=l.canton_id
    JOIN provincias p ON p.id=c.provincia_id
    WHERE p.codigo_dpa='16' AND c.codigo_cton='01' AND l.nombre='Puyo') OR
     NOT EXISTS (SELECT 1 FROM localidades l JOIN cantones c ON c.id=l.canton_id
    JOIN provincias p ON p.id=c.provincia_id
    WHERE p.codigo_dpa='14' AND c.codigo_cton='13' AND l.nombre='Sevilla Don Bosco') THEN
    RAISE EXCEPTION 'La cabecera no se resolvió por su código y nombre oficiales';
  END IF;
END $$;
CREATE TABLE locality_after AS SELECT * FROM localidades;
SQL

psql -X -v ON_ERROR_STOP=1 -d turismo_vinculacion_app \
  -f database/migrations/20261002_seed_national_localities.sql >>"$locality_log" 2>&1
psql -X -v ON_ERROR_STOP=1 -d turismo_vinculacion_app >>"$locality_log" 2>&1 <<'SQL'
DO $$
BEGIN
  IF EXISTS (SELECT * FROM locality_after EXCEPT SELECT * FROM localidades) OR
     EXISTS (SELECT * FROM localidades EXCEPT SELECT * FROM locality_after) THEN
    RAISE EXCEPTION 'La segunda ejecución no fue idempotente';
  END IF;
END $$;
SQL

# La DPA incompleta debe cancelar también el alta previa de Sevilla Don Bosco.
psql -X -v ON_ERROR_STOP=1 -d locality_missing_dpa >>"$locality_log" 2>&1 <<'SQL'
UPDATE cantones SET activo=false
WHERE codigo_cton='02' AND provincia_id=(SELECT id FROM provincias WHERE codigo_dpa='01');
SQL
if psql -X -v ON_ERROR_STOP=1 -d locality_missing_dpa \
  -f database/migrations/20261002_seed_national_localities.sql >"$locality_temp/expected-failure.log" 2>&1; then
  printf 'La migración aceptó una DPA incompleta.\n' >&2
  exit 1
fi
rg -q 'Faltan 1 cantones DPA activos' "$locality_temp/expected-failure.log"
psql -X -v ON_ERROR_STOP=1 -d locality_missing_dpa >>"$locality_log" 2>&1 <<'SQL'
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM localidades) OR EXISTS (
    SELECT 1 FROM cantones WHERE codigo_cton='13'
      AND provincia_id=(SELECT id FROM provincias WHERE codigo_dpa='14')
  ) THEN
    RAISE EXCEPTION 'La migración fallida dejó una carga parcial';
  END IF;
END $$;
SQL
printf 'Catálogo nacional verificado: 1046 referencias, historial preservado, repetición idempotente y rollback completo ante DPA incompleta.\n'
