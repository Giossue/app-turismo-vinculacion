-- Seed de desarrollo: una zona turística completa para la ciudad de Guaranda.
--
-- La zona y los puntos son contenido referencial para probar el mapa y la ficha.
-- Deben validarse institucionalmente antes de una publicación productiva. No crea
-- tablas ni columnas nuevas; usa únicamente localidades, zonas_turisticas y
-- puntos_interes existentes.

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

WITH localidad AS (
  INSERT INTO localidades (
    canton_id, nombre, tipo_localidad, latitud, longitud, ubicacion, activo
  )
  SELECT
    c.id,
    'Guaranda',
    'CIUDAD',
    -1.592630,
    -79.000980,
    ST_SetSRID(ST_MakePoint(-79.000980, -1.592630), 4326)::geography,
    TRUE
  FROM cantones c
  JOIN provincias p ON p.id = c.provincia_id
  WHERE p.codigo_dpa = '02'
    AND c.codigo_cton = '01'
  ON CONFLICT (canton_id, nombre) DO UPDATE SET
    tipo_localidad = EXCLUDED.tipo_localidad,
    latitud = EXCLUDED.latitud,
    longitud = EXCLUDED.longitud,
    ubicacion = EXCLUDED.ubicacion,
    activo = TRUE
  RETURNING id
), zona AS (
  INSERT INTO zonas_turisticas (
    localidad_id, nombre, latitud, longitud, ubicacion, activo
  )
  SELECT
    id,
    'Entorno de Guaranda',
    -1.592630,
    -79.000980,
    ST_SetSRID(ST_MakePoint(-79.000980, -1.592630), 4326)::geography,
    TRUE
  FROM localidad
  ON CONFLICT (localidad_id, nombre) DO UPDATE SET
    latitud = EXCLUDED.latitud,
    longitud = EXCLUDED.longitud,
    ubicacion = EXCLUDED.ubicacion,
    activo = TRUE
  RETURNING id
)
SELECT count(*) FROM zona;

WITH zona AS (
  SELECT z.id
  FROM zonas_turisticas z
  JOIN localidades l ON l.id = z.localidad_id
  JOIN cantones c ON c.id = l.canton_id
  JOIN provincias p ON p.id = c.provincia_id
  WHERE p.codigo_dpa = '02'
    AND c.codigo_cton = '01'
    AND l.nombre = 'Guaranda'
    AND z.nombre = 'Entorno de Guaranda'
), datos (nombre, latitud, longitud, descripcion) AS (
  VALUES
    (
      'Plaza cultural de Guaranda'::varchar,
      -1.593400::numeric,
      -79.000800::numeric,
      'Espacio urbano de encuentro para recorrer a pie y observar la arquitectura, la vida cotidiana y las actividades culturales del centro de Guaranda. Registro referencial de demostración; validar servicios, horarios y condiciones en sitio antes de publicar.'::text
    ),
    (
      'Sendero panorámico de Guaranda'::varchar,
      -1.600800::numeric,
      -79.007100::numeric,
      'Recorrido paisajístico de referencia para apreciar la ciudad y el relieve andino desde un entorno abierto. Registro referencial de demostración; confirmar el acceso, la señalización, la seguridad y el estado del sendero antes de publicar.'::text
    )
)
UPDATE puntos_interes pi
SET
  latitud = datos.latitud,
  longitud = datos.longitud,
  ubicacion = ST_SetSRID(ST_MakePoint(datos.longitud, datos.latitud), 4326)::geography,
  descripcion = datos.descripcion,
  activo = TRUE,
  updated_at = CURRENT_TIMESTAMP
FROM zona, datos
WHERE pi.zona_turistica_id = zona.id
  AND pi.nombre = datos.nombre;

WITH zona AS (
  SELECT z.id
  FROM zonas_turisticas z
  JOIN localidades l ON l.id = z.localidad_id
  JOIN cantones c ON c.id = l.canton_id
  JOIN provincias p ON p.id = c.provincia_id
  WHERE p.codigo_dpa = '02'
    AND c.codigo_cton = '01'
    AND l.nombre = 'Guaranda'
    AND z.nombre = 'Entorno de Guaranda'
), datos (nombre, latitud, longitud, descripcion) AS (
  VALUES
    (
      'Plaza cultural de Guaranda'::varchar,
      -1.593400::numeric,
      -79.000800::numeric,
      'Espacio urbano de encuentro para recorrer a pie y observar la arquitectura, la vida cotidiana y las actividades culturales del centro de Guaranda. Registro referencial de demostración; validar servicios, horarios y condiciones en sitio antes de publicar.'::text
    ),
    (
      'Sendero panorámico de Guaranda'::varchar,
      -1.600800::numeric,
      -79.007100::numeric,
      'Recorrido paisajístico de referencia para apreciar la ciudad y el relieve andino desde un entorno abierto. Registro referencial de demostración; confirmar el acceso, la señalización, la seguridad y el estado del sendero antes de publicar.'::text
    )
)
INSERT INTO puntos_interes (
  zona_turistica_id, nombre, latitud, longitud, ubicacion, descripcion, activo
)
SELECT
  zona.id,
  datos.nombre,
  datos.latitud,
  datos.longitud,
  ST_SetSRID(ST_MakePoint(datos.longitud, datos.latitud), 4326)::geography,
  datos.descripcion,
  TRUE
FROM zona, datos
WHERE NOT EXISTS (
  SELECT 1
  FROM puntos_interes pi
  WHERE pi.zona_turistica_id = zona.id
    AND pi.nombre = datos.nombre
);

DO $$
DECLARE
  zona_id BIGINT;
  puntos INTEGER;
BEGIN
  SELECT z.id
  INTO zona_id
  FROM zonas_turisticas z
  JOIN localidades l ON l.id = z.localidad_id
  JOIN cantones c ON c.id = l.canton_id
  JOIN provincias p ON p.id = c.provincia_id
  WHERE p.codigo_dpa = '02'
    AND c.codigo_cton = '01'
    AND l.nombre = 'Guaranda'
    AND l.activo
    AND z.nombre = 'Entorno de Guaranda'
    AND z.activo;

  IF zona_id IS NULL THEN
    RAISE EXCEPTION 'No se pudo crear o activar la zona Entorno de Guaranda';
  END IF;

  SELECT count(*)::INTEGER
  INTO puntos
  FROM puntos_interes
  WHERE zona_turistica_id = zona_id
    AND activo
    AND nombre IN ('Plaza cultural de Guaranda', 'Sendero panorámico de Guaranda');

  IF puntos <> 2 THEN
    RAISE EXCEPTION 'Se esperaban dos puntos activos en la zona; se encontraron %', puntos;
  END IF;
END $$;

COMMIT;
