-- Distribuye los 50 establecimientos del catastro demostrativo alrededor de su localidad.
--
-- Estas coordenadas siguen siendo aproximadas: solo evitan apilar todos los marcadores en
-- el centro de Guaranda, Riobamba, Ambato, Latacunga y Babahoyo. La migración se detiene si
-- alguna fila objetivo ya fue enriquecida con una ubicación distinta.
--
-- Rollback operativo: ejecutar el mismo UPDATE usando l.latitud y l.longitud como destino
-- para las filas aproximadas de estas cinco localidades.

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';

CREATE TEMP TABLE _demo_coordinate_offsets (
  position SMALLINT PRIMARY KEY,
  latitude_offset NUMERIC(9, 6) NOT NULL,
  longitude_offset NUMERIC(9, 6) NOT NULL
) ON COMMIT DROP;

INSERT INTO _demo_coordinate_offsets (
  position, latitude_offset, longitude_offset
)
VALUES
  (1, -0.010000, -0.006000),
  (2, -0.008000,  0.004000),
  (3, -0.005000, -0.010000),
  (4, -0.003000,  0.008000),
  (5,  0.000000, -0.004000),
  (6,  0.003000,  0.011000),
  (7,  0.006000, -0.009000),
  (8,  0.008000,  0.003000),
  (9,  0.011000, -0.002000),
  (10, 0.005000,  0.006000);

DO $$
DECLARE
  invalid_city RECORD;
  target_count INTEGER;
  locality_center_count INTEGER;
  expected_distribution_count INTEGER;
BEGIN
  FOR invalid_city IN
    SELECT l.nombre, COUNT(e.id) AS establishment_count
      FROM localidades l
      LEFT JOIN establecimientos_turisticos e
        ON e.localidad_id = l.id
       AND e.activo
       AND e.coordenadas_aproximadas
      JOIN cantones c ON c.id = l.canton_id
      JOIN provincias p ON p.id = c.provincia_id
     WHERE (p.codigo_dpa, c.codigo_cton, l.nombre) IN (
       ('02', '01', 'Guaranda'),
       ('06', '01', 'Riobamba'),
       ('18', '01', 'Ambato'),
       ('05', '01', 'Latacunga'),
       ('12', '01', 'Babahoyo')
     )
     GROUP BY l.id, l.nombre
    HAVING COUNT(e.id) <> 10
  LOOP
    RAISE EXCEPTION
      'La localidad % debe tener 10 catastros demo aproximados; tiene %',
      invalid_city.nombre,
      invalid_city.establishment_count;
  END LOOP;

  WITH ranked_establishments AS (
    SELECT
      e.id,
      e.latitud,
      e.longitud,
      l.latitud AS locality_latitude,
      l.longitud AS locality_longitude,
      ROW_NUMBER() OVER (
        PARTITION BY l.id
        ORDER BY e.numero_registro, e.id
      ) AS position
    FROM establecimientos_turisticos e
    JOIN localidades l ON l.id = e.localidad_id
    JOIN cantones c ON c.id = l.canton_id
    JOIN provincias p ON p.id = c.provincia_id
    WHERE e.activo
      AND e.coordenadas_aproximadas
      AND (p.codigo_dpa, c.codigo_cton, l.nombre) IN (
        ('02', '01', 'Guaranda'),
        ('06', '01', 'Riobamba'),
        ('18', '01', 'Ambato'),
        ('05', '01', 'Latacunga'),
        ('12', '01', 'Babahoyo')
      )
  )
  SELECT
    COUNT(*),
    COUNT(*) FILTER (
      WHERE ranked.latitud = ranked.locality_latitude
        AND ranked.longitud = ranked.locality_longitude
    ),
    COUNT(*) FILTER (
      WHERE ranked.latitud = ranked.locality_latitude + offsets.latitude_offset
        AND ranked.longitud = ranked.locality_longitude + offsets.longitude_offset
    )
  INTO target_count, locality_center_count, expected_distribution_count
  FROM ranked_establishments ranked
  JOIN _demo_coordinate_offsets offsets ON offsets.position = ranked.position;

  IF target_count <> 50
    OR NOT (
      locality_center_count = 50
      OR expected_distribution_count = 50
    )
  THEN
    RAISE EXCEPTION
      'Hay una distribución parcial o coordenadas aproximadas enriquecidas; revisión manual requerida';
  END IF;
END;
$$;

WITH ranked_establishments AS (
  SELECT
    e.id,
    l.latitud AS locality_latitude,
    l.longitud AS locality_longitude,
    ROW_NUMBER() OVER (
      PARTITION BY l.id
      ORDER BY e.numero_registro, e.id
    ) AS position
  FROM establecimientos_turisticos e
  JOIN localidades l ON l.id = e.localidad_id
  JOIN cantones c ON c.id = l.canton_id
  JOIN provincias p ON p.id = c.provincia_id
  WHERE e.activo
    AND e.coordenadas_aproximadas
    AND (p.codigo_dpa, c.codigo_cton, l.nombre) IN (
      ('02', '01', 'Guaranda'),
      ('06', '01', 'Riobamba'),
      ('18', '01', 'Ambato'),
      ('05', '01', 'Latacunga'),
      ('12', '01', 'Babahoyo')
    )
), distributed_coordinates AS (
  SELECT
    ranked.id,
    ranked.locality_latitude + offsets.latitude_offset AS latitude,
    ranked.locality_longitude + offsets.longitude_offset AS longitude
  FROM ranked_establishments ranked
  JOIN _demo_coordinate_offsets offsets ON offsets.position = ranked.position
)
UPDATE establecimientos_turisticos establishment
   SET latitud = distributed.latitude,
       longitud = distributed.longitude,
       coordenadas_aproximadas = TRUE,
       updated_at = CURRENT_TIMESTAMP
  FROM distributed_coordinates distributed
 WHERE establishment.id = distributed.id
   AND (
     establishment.latitud IS DISTINCT FROM distributed.latitude
     OR establishment.longitud IS DISTINCT FROM distributed.longitude
   );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM establecimientos_turisticos first_establishment
      JOIN establecimientos_turisticos second_establishment
        ON second_establishment.localidad_id = first_establishment.localidad_id
       AND second_establishment.id > first_establishment.id
       AND second_establishment.activo
       AND second_establishment.coordenadas_aproximadas
       AND second_establishment.latitud = first_establishment.latitud
       AND second_establishment.longitud = first_establishment.longitud
      JOIN localidades l ON l.id = first_establishment.localidad_id
      JOIN cantones c ON c.id = l.canton_id
      JOIN provincias p ON p.id = c.provincia_id
     WHERE first_establishment.activo
       AND first_establishment.coordenadas_aproximadas
       AND (p.codigo_dpa, c.codigo_cton, l.nombre) IN (
         ('02', '01', 'Guaranda'),
         ('06', '01', 'Riobamba'),
         ('18', '01', 'Ambato'),
         ('05', '01', 'Latacunga'),
         ('12', '01', 'Babahoyo')
       )
  ) THEN
    RAISE EXCEPTION 'La distribución dejó catastros demo apilados';
  END IF;
END;
$$;

COMMIT;
