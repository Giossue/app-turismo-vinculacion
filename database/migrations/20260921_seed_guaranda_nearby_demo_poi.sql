-- Crea un catastro demostrativo a diez metros del único centro publicado de Guaranda.
-- Se modela como establecimiento porque esa es la entidad que la capa móvil presenta
-- actualmente como "Punto de interés".

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM centros_turisticos center_record
    JOIN estados_resenia review_status
      ON review_status.id = center_record.estado_resenia_id
    JOIN parroquias parish ON parish.id = center_record.parroquia_id
    JOIN cantones canton ON canton.id = parish.canton_id
    WHERE center_record.activo
      AND review_status.codigo = 'PUBLICADO'
      AND canton.nombre = 'Guaranda'
  ) <> 1 THEN
    RAISE EXCEPTION
      'Se esperaba exactamente un centro turístico publicado en Guaranda';
  END IF;
END;
$$;

WITH target AS (
  SELECT
    locality.id AS locality_id,
    activity.id AS activity_id,
    classification.id AS classification_id,
    category.id AS category_id,
    ST_Project(center_record.ubicacion, 10, radians(90)) AS projected_location
  FROM centros_turisticos center_record
  JOIN estados_resenia review_status
    ON review_status.id = center_record.estado_resenia_id
  JOIN parroquias parish ON parish.id = center_record.parroquia_id
  JOIN cantones canton ON canton.id = parish.canton_id
  JOIN localidades locality
    ON locality.canton_id = canton.id
   AND locality.nombre = 'Guaranda'
   AND locality.activo
  JOIN catalogo_catastro_actividades activity
    ON activity.codigo = 'ACT_33017e0d8c3e70'
   AND activity.activo
  JOIN catalogo_catastro_clasificaciones classification
    ON classification.codigo = 'CLS_664166c3e719fe'
   AND classification.actividad_id = activity.id
   AND classification.activo
  JOIN catalogo_catastro_categorias category
    ON category.codigo = 'CAT_84ef592d052f5c'
   AND category.clasificacion_id = classification.id
   AND category.activo
  WHERE center_record.activo
    AND review_status.codigo = 'PUBLICADO'
    AND canton.nombre = 'Guaranda'
)
INSERT INTO establecimientos_turisticos (
  localidad_id,
  numero_registro,
  nombre_comercial,
  razon_social,
  actividad,
  clasificacion,
  categoria,
  latitud,
  longitud,
  coordenadas_aproximadas,
  actividad_catalogo_id,
  clasificacion_catalogo_id,
  categoria_catalogo_id,
  activo
)
SELECT
  target.locality_id,
  'DEMO-POI-GUARANDA-001',
  'Punto de interés cercano (demo)',
  NULL,
  'PARQUES DE ATRACCIONES ESTABLES',
  'CENTRO DE RECREACIÓN TURÍSTICA',
  'Categoría única',
  ST_Y(target.projected_location::geometry),
  ST_X(target.projected_location::geometry),
  TRUE,
  target.activity_id,
  target.classification_id,
  target.category_id,
  TRUE
FROM target
ON CONFLICT (numero_registro) DO UPDATE SET
  localidad_id = EXCLUDED.localidad_id,
  nombre_comercial = EXCLUDED.nombre_comercial,
  actividad = EXCLUDED.actividad,
  clasificacion = EXCLUDED.clasificacion,
  categoria = EXCLUDED.categoria,
  latitud = EXCLUDED.latitud,
  longitud = EXCLUDED.longitud,
  coordenadas_aproximadas = TRUE,
  actividad_catalogo_id = EXCLUDED.actividad_catalogo_id,
  clasificacion_catalogo_id = EXCLUDED.clasificacion_catalogo_id,
  categoria_catalogo_id = EXCLUDED.categoria_catalogo_id,
  activo = TRUE,
  updated_at = CURRENT_TIMESTAMP
WHERE (
  establecimientos_turisticos.localidad_id,
  establecimientos_turisticos.nombre_comercial,
  establecimientos_turisticos.actividad,
  establecimientos_turisticos.clasificacion,
  establecimientos_turisticos.categoria,
  establecimientos_turisticos.latitud,
  establecimientos_turisticos.longitud,
  establecimientos_turisticos.coordenadas_aproximadas,
  establecimientos_turisticos.actividad_catalogo_id,
  establecimientos_turisticos.clasificacion_catalogo_id,
  establecimientos_turisticos.categoria_catalogo_id,
  establecimientos_turisticos.activo
) IS DISTINCT FROM (
  EXCLUDED.localidad_id,
  EXCLUDED.nombre_comercial,
  EXCLUDED.actividad,
  EXCLUDED.clasificacion,
  EXCLUDED.categoria,
  EXCLUDED.latitud,
  EXCLUDED.longitud,
  TRUE,
  EXCLUDED.actividad_catalogo_id,
  EXCLUDED.clasificacion_catalogo_id,
  EXCLUDED.categoria_catalogo_id,
  TRUE
);

COMMIT;
