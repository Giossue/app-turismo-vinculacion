-- Datos públicos mínimos para desarrollo local. Puede ejecutarse repetidamente.
WITH provincia AS (
  INSERT INTO provincias (codigo_dpa, nombre)
  VALUES ('02', 'Bolívar')
  ON CONFLICT (codigo_dpa) DO UPDATE SET nombre = EXCLUDED.nombre
  RETURNING id
), canton AS (
  INSERT INTO cantones (provincia_id, codigo_cton, nombre)
  SELECT id, '02', 'Guaranda' FROM provincia
  ON CONFLICT (provincia_id, codigo_cton) DO UPDATE SET nombre = EXCLUDED.nombre
  RETURNING id
), parroquia AS (
  INSERT INTO parroquias (canton_id, codigo_pqa, nombre)
  SELECT id, '01', 'Guanujo' FROM canton
  ON CONFLICT (canton_id, codigo_pqa) DO UPDATE SET nombre = EXCLUDED.nombre
  RETURNING id
), localidad AS (
  INSERT INTO localidades (canton_id, nombre, tipo_localidad, latitud, longitud, ubicacion)
  SELECT c.id, 'Guaranda', 'CIUDAD', -1.592630, -79.000980,
         ST_SetSRID(ST_MakePoint(-79.000980, -1.592630), 4326)::GEOGRAPHY
  FROM canton c
  ON CONFLICT (canton_id, nombre) DO UPDATE SET nombre = EXCLUDED.nombre
  RETURNING id
), zona AS (
  INSERT INTO zonas_turisticas (localidad_id, nombre, latitud, longitud, ubicacion)
  SELECT id, 'Entorno de Guaranda', -1.592630, -79.000980,
         ST_SetSRID(ST_MakePoint(-79.000980, -1.592630), 4326)::GEOGRAPHY
  FROM localidad
  ON CONFLICT (localidad_id, nombre) DO UPDATE SET nombre = EXCLUDED.nombre
  RETURNING id
), tipo AS (
  INSERT INTO tipos_atractivo (categoria_id, codigo, nombre)
  SELECT id, '01', 'Sitios naturales' FROM categorias_atractivo WHERE codigo = 'AN'
  ON CONFLICT (categoria_id, codigo) DO UPDATE SET nombre = EXCLUDED.nombre
  RETURNING id
), subtipo AS (
  INSERT INTO subtipos_atractivo (tipo_atractivo_id, codigo, nombre)
  SELECT id, '01', 'Miradores' FROM tipo
  ON CONFLICT (tipo_atractivo_id, codigo) DO UPDATE SET nombre = EXCLUDED.nombre
  RETURNING id
)
INSERT INTO centros_turisticos (
  secuencial_atractivo, nombre, subtipo_atractivo_id, zona_turistica_id, parroquia_id,
  linea_producto_id, escenario_id, jerarquia_id, estado_resenia_id, puntaje_total,
  barrio_sector_comuna, latitud, longitud, ubicacion, altitud_msnm, descripcion,
  activo, publicado_at
)
SELECT
  1, 'Mirador turístico de Guaranda', st.id, z.id, p.id,
  lp.id, e.id, j.id, er.id, 65,
  'Guaranda', -1.592630, -79.000980,
  ST_SetSRID(ST_MakePoint(-79.000980, -1.592630), 4326)::GEOGRAPHY,
  2668, 'Centro de demostración para el primer corte público local.', TRUE, NOW()
FROM subtipo st
CROSS JOIN zona z
CROSS JOIN parroquia p
CROSS JOIN lineas_producto lp
CROSS JOIN escenarios e
CROSS JOIN rangos_jerarquia j
CROSS JOIN estados_resenia er
WHERE lp.codigo = 'CULTURA'
  AND e.codigo = 'URBANO'
  AND j.codigo = '03'
  AND er.codigo = 'PUBLICADO'
ON CONFLICT (parroquia_id, secuencial_atractivo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  estado_resenia_id = EXCLUDED.estado_resenia_id,
  activo = EXCLUDED.activo,
  publicado_at = EXCLUDED.publicado_at,
  updated_at = NOW();
