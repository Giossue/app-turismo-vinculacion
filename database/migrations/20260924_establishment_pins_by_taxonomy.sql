-- Reasigna el pin Osmic de cada clasificación del catastro a partir de su
-- actividad y nombre.
--
-- `20260922_osmic_establishment_pins.sql` traducía el icono anterior con un
-- CASE que no reconocía los códigos Osmic: al volver a ejecutarse, todas las
-- clasificaciones quedaron en 'shop-supermarket' y el mapa mostraba el mismo
-- pin para todo. Esta migración deriva el icono de la taxonomía, no del valor
-- previo, por lo que es idempotente.
-- Requiere 20260922_osmic_establishment_pins.sql.

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

WITH classification_pins AS (
  SELECT
    classification.id,
    CASE
      WHEN classification.nombre = 'CAMPAMENTO TURÍSTICO' THEN 'outdoor-camping'
      WHEN activity.nombre = 'ALOJAMIENTO' THEN 'accommodation-hotel'
      WHEN classification.nombre IN ('CAFETERÍA', 'BAR', 'DISCOTECA')
        THEN 'eat-drink-cafe'
      WHEN activity.nombre = 'ALIMENTOS, BEBIDAS Y ENTRETENIMIENTO'
        THEN 'eat-drink-restaurant'
      WHEN activity.nombre = 'TRANSPORTE TURÍSTICO' THEN 'transport-bus-stop'
      WHEN activity.nombre = 'PARQUES DE ATRACCIONES ESTABLES' THEN 'amenity-cinema'
      WHEN activity.nombre = 'CENTROS DE TURISMO COMUNITARIO' THEN 'tourism-viewpoint'
      WHEN activity.nombre IN (
        'AGENCIAMIENTO TURÍSTICO',
        'GUIANZA TURÍSTICA',
        'ORGANIZADORES DE EVENTOS, CONGRESOS Y CONVENCIONES'
      ) THEN 'tourism-information'
      ELSE 'shop-supermarket'
    END AS icono
  FROM catalogo_catastro_clasificaciones classification
  JOIN catalogo_catastro_actividades activity
    ON activity.id = classification.actividad_id
)
UPDATE catalogo_catastro_clasificaciones classification
   SET icono = pins.icono
  FROM classification_pins pins
 WHERE classification.id = pins.id
   AND classification.icono IS DISTINCT FROM pins.icono;

-- El color sigue derivado del icono (misma tabla que la migración Osmic).
UPDATE catalogo_catastro_clasificaciones
   SET color = CASE icono
     WHEN 'accommodation-hotel' THEN '#7a5c3e'
     WHEN 'amenity-cinema' THEN '#7e22ce'
     WHEN 'eat-drink-cafe' THEN '#8b5e34'
     WHEN 'eat-drink-restaurant' THEN '#b45309'
     WHEN 'outdoor-camping' THEN '#3f6212'
     WHEN 'shop-supermarket' THEN '#be123c'
     WHEN 'tourism-information' THEN '#0369a1'
     WHEN 'tourism-viewpoint' THEN '#a16207'
     WHEN 'transport-bus-stop' THEN '#155e75'
     ELSE color
   END;

-- Las categorías reflejan el perfil visual de su clasificación padre.
UPDATE catalogo_catastro_categorias category
   SET icono = classification.icono,
       color = classification.color
  FROM catalogo_catastro_clasificaciones classification
 WHERE classification.id = category.clasificacion_id
   AND (category.icono IS DISTINCT FROM classification.icono
     OR category.color IS DISTINCT FROM classification.color);

COMMIT;
