-- Asigna iconos y colores semánticos a las categorías del catastro.
-- El azul puro permanece reservado para la ubicación actual del turista.
-- La operación es idempotente y no modifica establecimientos ni taxonomía.

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

WITH expected_visuals AS (
  SELECT
    category.id,
    CASE
      WHEN activity.nombre = 'ALOJAMIENTO' THEN 'hotel'
      WHEN classification.nombre = 'RESTAURANTE' THEN 'restaurant'
      WHEN classification.nombre = 'CAFETERÍA' THEN 'coffee'
      WHEN classification.nombre IN ('BAR', 'DISCOTECA') THEN 'coffee'
      WHEN activity.nombre = 'TRANSPORTE TURÍSTICO' THEN 'bus'
      WHEN activity.nombre = 'AGENCIAMIENTO TURÍSTICO' THEN 'briefcase'
      WHEN activity.nombre IN (
        'GUIANZA TURÍSTICA',
        'ORGANIZADORES DE EVENTOS, CONGRESOS Y CONVENCIONES',
        'PARQUES DE ATRACCIONES ESTABLES'
      ) THEN 'ticket'
      ELSE 'store'
    END AS icon,
    CASE
      WHEN activity.nombre = 'ALOJAMIENTO' THEN '#7c3aed'
      WHEN classification.nombre = 'RESTAURANTE' THEN '#ea580c'
      WHEN classification.nombre = 'CAFETERÍA' THEN '#d97706'
      WHEN classification.nombre IN ('BAR', 'DISCOTECA') THEN '#c026d3'
      WHEN activity.nombre = 'GUIANZA TURÍSTICA' THEN '#dc2626'
      WHEN activity.nombre = 'TRANSPORTE TURÍSTICO' THEN '#0891b2'
      WHEN activity.nombre = 'AGENCIAMIENTO TURÍSTICO' THEN '#0891b2'
      WHEN activity.nombre = 'ORGANIZADORES DE EVENTOS, CONGRESOS Y CONVENCIONES'
        THEN '#4f46e5'
      WHEN activity.nombre = 'PARQUES DE ATRACCIONES ESTABLES' THEN '#dc2626'
      ELSE '#c026d3'
    END AS color
  FROM catalogo_catastro_categorias category
  JOIN catalogo_catastro_clasificaciones classification
    ON classification.id = category.clasificacion_id
  JOIN catalogo_catastro_actividades activity
    ON activity.id = classification.actividad_id
)
UPDATE catalogo_catastro_categorias category
   SET icono = expected.icon,
       color = expected.color
  FROM expected_visuals expected
 WHERE category.id = expected.id
   AND (
     category.icono IS DISTINCT FROM expected.icon
     OR category.color IS DISTINCT FROM expected.color
   );

COMMIT;

