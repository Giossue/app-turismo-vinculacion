-- Datos públicos de demostración para desarrollar el mapa local.
-- No representa un inventario oficial ni incluye archivos multimedia.
-- Es idempotente por catálogo y por (parroquia, secuencial_atractivo).
BEGIN;

INSERT INTO categorias_atractivo (codigo, nombre)
VALUES ('MC', 'Manifestaciones culturales')
ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO tipos_atractivo (categoria_id, codigo, nombre)
SELECT ca.id, '01', 'Manifestaciones históricas'
FROM categorias_atractivo ca
WHERE ca.codigo = 'MC'
ON CONFLICT (categoria_id, codigo) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO tipos_atractivo (categoria_id, codigo, nombre)
SELECT ca.id, '02', 'Espacios culturales'
FROM categorias_atractivo ca
WHERE ca.codigo = 'MC'
ON CONFLICT (categoria_id, codigo) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO subtipos_atractivo (tipo_atractivo_id, codigo, nombre)
SELECT ta.id, '01', 'Centro histórico'
FROM tipos_atractivo ta
JOIN categorias_atractivo ca ON ca.id = ta.categoria_id
WHERE ca.codigo = 'MC' AND ta.codigo = '01'
ON CONFLICT (tipo_atractivo_id, codigo) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO subtipos_atractivo (tipo_atractivo_id, codigo, nombre)
SELECT ta.id, '01', 'Plazas y espacios públicos'
FROM tipos_atractivo ta
JOIN categorias_atractivo ca ON ca.id = ta.categoria_id
WHERE ca.codigo = 'MC' AND ta.codigo = '02'
ON CONFLICT (tipo_atractivo_id, codigo) DO UPDATE SET nombre = EXCLUDED.nombre;

WITH demo (
  secuencial, nombre, categoria_codigo, tipo_codigo, subtipo_codigo,
  linea_codigo, escenario_codigo, jerarquia_codigo, latitud, longitud,
  altitud_msnm, descripcion
) AS (
  VALUES
    (2, 'Mirador El Calvario (demo)', 'AN', '01', '01', 'NATURALEZA', 'URBANO', '02', -1.585500, -79.003700, 2750, 'Registro de demostración para validar marcadores y fichas en el mapa.'),
    (3, 'Sendero panorámico de Guaranda (demo)', 'AN', '01', '01', 'NATURALEZA', 'RURAL', '02', -1.600800, -79.007100, 2800, 'Registro de demostración para validar filtros y búsqueda territorial.'),
    (4, 'Centro histórico de Guaranda (demo)', 'MC', '01', '01', 'CULTURA', 'URBANO', '03', -1.592100, -79.000500, 2668, 'Registro de demostración cultural; requiere validación institucional antes de publicarse.'),
    (5, 'Plaza cultural de Guaranda (demo)', 'MC', '02', '01', 'CULTURA', 'URBANO', '03', -1.593400, -79.000800, 2668, 'Registro de demostración cultural para probar la ficha simplificada.')
), referencias AS (
  SELECT d.*,
    p.id AS parroquia_id,
    z.id AS zona_turistica_id,
    sa.id AS subtipo_atractivo_id,
    lp.id AS linea_producto_id,
    e.id AS escenario_id,
    j.id AS jerarquia_id,
    er.id AS estado_resenia_id
  FROM demo d
  JOIN parroquias p ON p.codigo_pqa = '01'
  JOIN cantones c ON c.id = p.canton_id AND c.codigo_cton = '02'
  JOIN provincias pr ON pr.id = c.provincia_id AND pr.codigo_dpa = '02'
  JOIN zonas_turisticas z ON z.localidad_id = (
    SELECT l.id FROM localidades l
    WHERE l.canton_id = c.id AND l.nombre = 'Guaranda'
  ) AND z.nombre = 'Entorno de Guaranda'
  JOIN categorias_atractivo ca ON ca.codigo = d.categoria_codigo
  JOIN tipos_atractivo ta ON ta.categoria_id = ca.id AND ta.codigo = d.tipo_codigo
  JOIN subtipos_atractivo sa ON sa.tipo_atractivo_id = ta.id AND sa.codigo = d.subtipo_codigo
  JOIN lineas_producto lp ON lp.codigo = d.linea_codigo
  JOIN escenarios e ON e.codigo = d.escenario_codigo
  JOIN rangos_jerarquia j ON j.codigo = d.jerarquia_codigo
  JOIN estados_resenia er ON er.codigo = 'PUBLICADO'
)
INSERT INTO centros_turisticos (
  secuencial_atractivo, nombre, subtipo_atractivo_id, zona_turistica_id,
  parroquia_id, linea_producto_id, escenario_id, jerarquia_id,
  estado_resenia_id, puntaje_total, barrio_sector_comuna, latitud,
  longitud, altitud_msnm, descripcion, activo, publicado_at
)
SELECT
  secuencial, nombre, subtipo_atractivo_id, zona_turistica_id, parroquia_id,
  linea_producto_id, escenario_id, jerarquia_id, estado_resenia_id,
  CASE jerarquia_codigo
    WHEN '02' THEN 50
    WHEN '03' THEN 65
    ELSE 35
  END,
  'Guaranda', latitud, longitud, altitud_msnm, descripcion, TRUE, CURRENT_TIMESTAMP
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
  latitud = EXCLUDED.latitud,
  longitud = EXCLUDED.longitud,
  altitud_msnm = EXCLUDED.altitud_msnm,
  descripcion = EXCLUDED.descripcion,
  activo = TRUE,
  publicado_at = EXCLUDED.publicado_at,
  updated_at = CURRENT_TIMESTAMP;

COMMIT;
