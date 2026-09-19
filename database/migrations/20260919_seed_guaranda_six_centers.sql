-- Seed de desarrollo: seis centros distribuidos alrededor de Guaranda.
--
-- Las coordenadas y descripciones son referenciales para probar el mapa y deben
-- sustituirse por fichas institucionales verificadas antes de producción.
-- La parroquia 01 sigue la referencia utilizada por el seed de Guaranda existente.

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

INSERT INTO provincias (codigo_dpa, nombre)
VALUES ('02', 'Bolívar')
ON CONFLICT (codigo_dpa) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  activo = TRUE;

INSERT INTO cantones (provincia_id, codigo_cton, nombre)
SELECT p.id, '02', 'Guaranda'
FROM provincias p
WHERE p.codigo_dpa = '02'
ON CONFLICT (provincia_id, codigo_cton) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  activo = TRUE;

INSERT INTO parroquias (canton_id, codigo_pqa, nombre)
SELECT c.id, '01', 'Guanujo'
FROM cantones c
JOIN provincias p ON p.id = c.provincia_id
WHERE p.codigo_dpa = '02' AND c.codigo_cton = '02'
ON CONFLICT (canton_id, codigo_pqa) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  activo = TRUE;

INSERT INTO categorias_atractivo (codigo, nombre)
VALUES
  ('AN', 'Atractivos naturales'),
  ('MC', 'Manifestaciones culturales')
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  activo = TRUE;

INSERT INTO tipos_atractivo (categoria_id, codigo, nombre)
SELECT ca.id, seed.codigo, seed.nombre
FROM (
  VALUES
    ('AN'::char(2), '01'::char(2), 'Sitios naturales'::varchar),
    ('MC'::char(2), '01'::char(2), 'Manifestaciones históricas'::varchar),
    ('MC'::char(2), '02'::char(2), 'Espacios culturales'::varchar)
) AS seed(categoria_codigo, codigo, nombre)
JOIN categorias_atractivo ca ON ca.codigo = seed.categoria_codigo
ON CONFLICT (categoria_id, codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  activo = TRUE;

INSERT INTO subtipos_atractivo (tipo_atractivo_id, codigo, nombre)
SELECT ta.id, seed.codigo, seed.nombre
FROM (
  VALUES
    ('AN'::char(2), '01'::char(2), '01'::char(2), 'Miradores'::varchar),
    ('AN'::char(2), '01'::char(2), '02'::char(2), 'Lagunas'::varchar),
    ('MC'::char(2), '01'::char(2), '01'::char(2), 'Centro histórico'::varchar),
    ('MC'::char(2), '02'::char(2), '01'::char(2), 'Plazas y espacios públicos'::varchar)
) AS seed(categoria_codigo, tipo_codigo, codigo, nombre)
JOIN categorias_atractivo ca ON ca.codigo = seed.categoria_codigo
JOIN tipos_atractivo ta
  ON ta.categoria_id = ca.id
 AND ta.codigo = seed.tipo_codigo
ON CONFLICT (tipo_atractivo_id, codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  activo = TRUE;

INSERT INTO lineas_producto (codigo, nombre)
VALUES
  ('NATURALEZA', 'Naturaleza'),
  ('CULTURA', 'Cultura')
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  activo = TRUE;

INSERT INTO escenarios (codigo, nombre)
VALUES
  ('URBANO', 'Urbano'),
  ('RURAL', 'Rural')
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  activo = TRUE;

INSERT INTO estados_resenia (codigo, nombre)
VALUES ('PUBLICADO', 'Publicado')
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  activo = TRUE;

INSERT INTO rangos_jerarquia (
  codigo, nombre, puntaje_minimo, puntaje_maximo, descripcion
)
VALUES
  ('02', 'II', 35, 60, 'Jerarquía II: más de 35 y hasta 60'),
  ('03', 'III', 60, 85, 'Jerarquía III: más de 60 y hasta 85')
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  puntaje_minimo = EXCLUDED.puntaje_minimo,
  puntaje_maximo = EXCLUDED.puntaje_maximo,
  descripcion = EXCLUDED.descripcion,
  activo = TRUE;

INSERT INTO localidades (
  canton_id, nombre, tipo_localidad, latitud, longitud, ubicacion
)
SELECT c.id, seed.nombre, seed.tipo_localidad, seed.latitud, seed.longitud,
       ST_SetSRID(ST_MakePoint(seed.longitud, seed.latitud), 4326)::geography
FROM (
  VALUES
    ('Guaranda'::varchar, 'CIUDAD'::varchar, -1.592100::numeric, -79.000500::numeric),
    ('Guanujo'::varchar, 'POBLADO'::varchar, -1.561307::numeric, -79.008925::numeric),
    ('Patococha'::varchar, 'POBLADO'::varchar, -1.545068::numeric, -78.981277::numeric),
    ('San Simón'::varchar, 'POBLADO'::varchar, -1.641268::numeric, -78.989965::numeric),
    ('Santa Fe'::varchar, 'POBLADO'::varchar, -1.614417::numeric, -79.011786::numeric),
    ('San Lorenzo'::varchar, 'POBLADO'::varchar, -1.676174::numeric, -78.996978::numeric)
) AS seed(nombre, tipo_localidad, latitud, longitud)
JOIN cantones c ON c.codigo_cton = '02'
JOIN provincias p ON p.id = c.provincia_id AND p.codigo_dpa = '02'
ON CONFLICT (canton_id, nombre) DO UPDATE SET
  tipo_localidad = EXCLUDED.tipo_localidad,
  latitud = EXCLUDED.latitud,
  longitud = EXCLUDED.longitud,
  ubicacion = EXCLUDED.ubicacion,
  activo = TRUE;

INSERT INTO zonas_turisticas (
  localidad_id, nombre, latitud, longitud, ubicacion
)
SELECT l.id, seed.zona, seed.latitud, seed.longitud,
       ST_SetSRID(ST_MakePoint(seed.longitud, seed.latitud), 4326)::geography
FROM (
  VALUES
    ('Guaranda'::varchar, 'Centro histórico de Guaranda'::varchar, -1.592100::numeric, -79.000500::numeric),
    ('Guanujo'::varchar, 'Mirador de Guanujo'::varchar, -1.561307::numeric, -79.008925::numeric),
    ('Patococha'::varchar, 'Laguna Las Cochas'::varchar, -1.545068::numeric, -78.981277::numeric),
    ('San Simón'::varchar, 'Centro comunitario de San Simón'::varchar, -1.641268::numeric, -78.989965::numeric),
    ('Santa Fe'::varchar, 'Mirador de Santa Fe'::varchar, -1.614417::numeric, -79.011786::numeric),
    ('San Lorenzo'::varchar, 'Mirador de San Lorenzo'::varchar, -1.676174::numeric, -78.996978::numeric)
) AS seed(localidad, zona, latitud, longitud)
JOIN localidades l ON l.nombre = seed.localidad
JOIN cantones c ON c.id = l.canton_id AND c.codigo_cton = '02'
JOIN provincias p ON p.id = c.provincia_id AND p.codigo_dpa = '02'
ON CONFLICT (localidad_id, nombre) DO UPDATE SET
  latitud = EXCLUDED.latitud,
  longitud = EXCLUDED.longitud,
  ubicacion = EXCLUDED.ubicacion,
  activo = TRUE;

WITH seed (
  secuencial, nombre, descripcion, localidad, zona, categoria, tipo, subtipo,
  linea, escenario, jerarquia, latitud, longitud, altitud, barrio, calle
) AS (
  VALUES
    (
      1,
      'Centro histórico de Guaranda',
      'Registro de demostración para validar el mapa; reemplazar por una ficha institucional verificada.',
      'Guaranda',
      'Centro histórico de Guaranda',
      'MC', '01', '01', 'CULTURA', 'URBANO', '03',
      -1.592100::numeric, -79.000500::numeric, 2668,
      'Centro de Guaranda', 'Calle Convención'
    ),
    (
      2,
      'Mirador de Guanujo',
      'Registro de demostración para validar un punto panorámico separado del centro urbano.',
      'Guanujo',
      'Mirador de Guanujo',
      'AN', '01', '01', 'NATURALEZA', 'RURAL', '02',
      -1.561307::numeric, -79.008925::numeric, 2750,
      'Guanujo', 'Acceso principal'
    ),
    (
      3,
      'Laguna Las Cochas',
      'Registro de demostración para validar un atractivo natural al noreste de Guaranda.',
      'Patococha',
      'Laguna Las Cochas',
      'AN', '01', '02', 'NATURALEZA', 'RURAL', '03',
      -1.545068::numeric, -78.981277::numeric, 3200,
      'Patococha', 'Vía de acceso local'
    ),
    (
      4,
      'Centro comunitario de San Simón',
      'Registro de demostración para validar un punto cultural al sur de Guaranda.',
      'San Simón',
      'Centro comunitario de San Simón',
      'MC', '02', '01', 'CULTURA', 'RURAL', '02',
      -1.641268::numeric, -78.989965::numeric, 2700,
      'San Simón', 'Vía principal'
    ),
    (
      5,
      'Mirador de Santa Fe',
      'Registro de demostración para validar un punto panorámico al suroeste de Guaranda.',
      'Santa Fe',
      'Mirador de Santa Fe',
      'AN', '01', '01', 'NATURALEZA', 'RURAL', '02',
      -1.614417::numeric, -79.011786::numeric, 2800,
      'Santa Fe', 'Acceso comunitario'
    ),
    (
      6,
      'Mirador de San Lorenzo',
      'Registro de demostración para validar un punto panorámico al sur de Guaranda.',
      'San Lorenzo',
      'Mirador de San Lorenzo',
      'AN', '01', '01', 'NATURALEZA', 'RURAL', '02',
      -1.676174::numeric, -78.996978::numeric, 2900,
      'San Lorenzo', 'Acceso principal'
    )
), referencias AS (
  SELECT seed.*,
         p.id AS parroquia_id,
         z.id AS zona_turistica_id,
         sa.id AS subtipo_atractivo_id,
         lp.id AS linea_producto_id,
         e.id AS escenario_id,
         j.id AS jerarquia_id,
         er.id AS estado_resenia_id
  FROM seed
  JOIN provincias pr ON pr.codigo_dpa = '02'
  JOIN cantones c ON c.provincia_id = pr.id AND c.codigo_cton = '02'
  JOIN parroquias p ON p.canton_id = c.id AND p.codigo_pqa = '01'
  JOIN localidades l ON l.canton_id = c.id AND l.nombre = seed.localidad
  JOIN zonas_turisticas z ON z.localidad_id = l.id AND z.nombre = seed.zona
  JOIN categorias_atractivo ca ON ca.codigo = seed.categoria
  JOIN tipos_atractivo ta ON ta.categoria_id = ca.id AND ta.codigo = seed.tipo
  JOIN subtipos_atractivo sa ON sa.tipo_atractivo_id = ta.id AND sa.codigo = seed.subtipo
  JOIN lineas_producto lp ON lp.codigo = seed.linea
  JOIN escenarios e ON e.codigo = seed.escenario
  JOIN rangos_jerarquia j ON j.codigo = seed.jerarquia
  JOIN estados_resenia er ON er.codigo = 'PUBLICADO'
)
INSERT INTO centros_turisticos (
  secuencial_atractivo, nombre, subtipo_atractivo_id, zona_turistica_id,
  parroquia_id, linea_producto_id, escenario_id, jerarquia_id,
  estado_resenia_id, puntaje_total, barrio_sector_comuna, calle_principal,
  latitud, longitud, ubicacion, altitud_msnm, descripcion, activo, publicado_at
)
SELECT secuencial, nombre, subtipo_atractivo_id, zona_turistica_id,
       parroquia_id, linea_producto_id, escenario_id, jerarquia_id,
       estado_resenia_id,
       CASE jerarquia WHEN '02' THEN 50 ELSE 65 END,
       barrio, calle, latitud, longitud,
       ST_SetSRID(ST_MakePoint(longitud, latitud), 4326)::geography,
       altitud, descripcion, TRUE, CURRENT_TIMESTAMP
FROM referencias
ON CONFLICT (parroquia_id, secuencial_atractivo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  subtipo_atractivo_id = EXCLUDED.subtipo_atractivo_id,
  zona_turistica_id = EXCLUDED.zona_turistica_id,
  linea_producto_id = EXCLUDED.linea_producto_id,
  escenario_id = EXCLUDED.escenario_id,
  jerarquia_id = EXCLUDED.jerarquia_id,
  estado_resenia_id = EXCLUDED.estado_resenia_id,
  puntaje_total = EXCLUDED.puntaje_total,
  barrio_sector_comuna = EXCLUDED.barrio_sector_comuna,
  calle_principal = EXCLUDED.calle_principal,
  latitud = EXCLUDED.latitud,
  longitud = EXCLUDED.longitud,
  ubicacion = EXCLUDED.ubicacion,
  altitud_msnm = EXCLUDED.altitud_msnm,
  descripcion = EXCLUDED.descripcion,
  activo = TRUE,
  publicado_at = EXCLUDED.publicado_at,
  updated_at = CURRENT_TIMESTAMP;

DO $$
DECLARE
  total_centers INTEGER;
BEGIN
  SELECT COUNT(*)
    INTO total_centers
  FROM centros_turisticos c
  JOIN parroquias p ON p.id = c.parroquia_id
  JOIN cantones ct ON ct.id = p.canton_id
  JOIN provincias pr ON pr.id = ct.provincia_id
  WHERE pr.codigo_dpa = '02'
    AND ct.codigo_cton = '02'
    AND c.secuencial_atractivo BETWEEN 1 AND 6
    AND c.activo
    AND c.estado_resenia_id = (SELECT id FROM estados_resenia WHERE codigo = 'PUBLICADO');

  IF total_centers <> 6 THEN
    RAISE EXCEPTION 'Se esperaban 6 centros publicados de Guaranda; se encontraron %', total_centers;
  END IF;
END;
$$;

COMMIT;
