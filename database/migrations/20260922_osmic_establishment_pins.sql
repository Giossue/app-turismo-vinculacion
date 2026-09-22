-- Sustituye los iconos genéricos del catastro por el conjunto Osmic curado.
-- El color queda derivado del icono; no se acepta como decisión administrativa.
-- Requiere 20260922_establishment_semantic_taxonomy.sql.

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

ALTER TABLE catalogo_catastro_clasificaciones
  DROP CONSTRAINT IF EXISTS catalogo_catastro_clasificaciones_icono_check;

ALTER TABLE catalogo_catastro_clasificaciones
  DROP CONSTRAINT IF EXISTS catalogo_catastro_clasificaciones_color_check;

ALTER TABLE catalogo_catastro_categorias
  DROP CONSTRAINT IF EXISTS catalogo_catastro_categorias_icono_check;

ALTER TABLE catalogo_catastro_categorias
  DROP CONSTRAINT IF EXISTS catalogo_catastro_categorias_color_check;

-- Conserva la semántica visual anterior cuando existe y traduce los códigos
-- históricos a sus equivalentes Osmic más cercanos.
UPDATE catalogo_catastro_clasificaciones
   SET icono = CASE icono
     WHEN 'hotel' THEN 'accommodation-hotel'
     WHEN 'restaurant' THEN 'eat-drink-restaurant'
     WHEN 'coffee' THEN 'eat-drink-cafe'
     WHEN 'store' THEN 'shop-supermarket'
     WHEN 'bus' THEN 'transport-bus-stop'
     WHEN 'ticket' THEN 'tourism-information'
     WHEN 'briefcase' THEN 'tourism-information'
     WHEN 'mapPin' THEN 'shop-supermarket'
     ELSE 'shop-supermarket'
   END;

UPDATE catalogo_catastro_clasificaciones
   SET color = CASE icono
     WHEN 'accommodation-hotel' THEN '#7a5c3e'
     WHEN 'amenity-cinema' THEN '#7e22ce'
     WHEN 'amenity-library' THEN '#334155'
     WHEN 'amenity-toilets' THEN '#64748b'
     WHEN 'eat-drink-cafe' THEN '#8b5e34'
     WHEN 'eat-drink-restaurant' THEN '#b45309'
     WHEN 'health-hospital' THEN '#9f1239'
     WHEN 'money-atm' THEN '#475569'
     WHEN 'money-bank' THEN '#374151'
     WHEN 'outdoor-camping' THEN '#3f6212'
     WHEN 'outdoor-drinking-water' THEN '#0f766e'
     WHEN 'religious-place-of-worship' THEN '#6d28d9'
     WHEN 'shop-supermarket' THEN '#be123c'
     WHEN 'tourism-information' THEN '#0369a1'
     WHEN 'tourism-monument' THEN '#92400e'
     WHEN 'tourism-museum' THEN '#5b21b6'
     WHEN 'tourism-viewpoint' THEN '#a16207'
     WHEN 'transport-bus-stop' THEN '#155e75'
     ELSE '#be123c'
   END;

ALTER TABLE catalogo_catastro_clasificaciones
  ALTER COLUMN icono SET DEFAULT 'shop-supermarket',
  ALTER COLUMN color SET DEFAULT '#be123c';

-- Los campos de categoría permanecen por compatibilidad con despliegues
-- anteriores, pero reflejan el perfil visual de su clasificación padre.
UPDATE catalogo_catastro_categorias category
   SET icono = classification.icono,
       color = classification.color
  FROM catalogo_catastro_clasificaciones classification
 WHERE classification.id = category.clasificacion_id;

ALTER TABLE catalogo_catastro_clasificaciones
  ADD CONSTRAINT catalogo_catastro_clasificaciones_icono_check
  CHECK (icono IN (
    'accommodation-hotel', 'amenity-cinema', 'amenity-library',
    'amenity-toilets', 'eat-drink-cafe', 'eat-drink-restaurant',
    'health-hospital', 'money-atm', 'money-bank', 'outdoor-camping',
    'outdoor-drinking-water', 'religious-place-of-worship',
    'shop-supermarket', 'tourism-information', 'tourism-monument',
    'tourism-museum', 'tourism-viewpoint', 'transport-bus-stop'
  ));

ALTER TABLE catalogo_catastro_clasificaciones
  ADD CONSTRAINT catalogo_catastro_clasificaciones_color_check
  CHECK (color IN (
    '#7a5c3e', '#7e22ce', '#334155', '#64748b', '#8b5e34', '#b45309',
    '#9f1239', '#475569', '#374151', '#3f6212', '#0f766e', '#6d28d9',
    '#be123c', '#0369a1', '#92400e', '#5b21b6', '#a16207', '#155e75'
  ));

ALTER TABLE catalogo_catastro_categorias
  ADD CONSTRAINT catalogo_catastro_categorias_icono_check
  CHECK (icono IN (
    'accommodation-hotel', 'amenity-cinema', 'amenity-library',
    'amenity-toilets', 'eat-drink-cafe', 'eat-drink-restaurant',
    'health-hospital', 'money-atm', 'money-bank', 'outdoor-camping',
    'outdoor-drinking-water', 'religious-place-of-worship',
    'shop-supermarket', 'tourism-information', 'tourism-monument',
    'tourism-museum', 'tourism-viewpoint', 'transport-bus-stop'
  ));

ALTER TABLE catalogo_catastro_categorias
  ADD CONSTRAINT catalogo_catastro_categorias_color_check
  CHECK (color IN (
    '#7a5c3e', '#7e22ce', '#334155', '#64748b', '#8b5e34', '#b45309',
    '#9f1239', '#475569', '#374151', '#3f6212', '#0f766e', '#6d28d9',
    '#be123c', '#0369a1', '#92400e', '#5b21b6', '#a16207', '#155e75'
  ));

ALTER TABLE catalogo_catastro_categorias
  ALTER COLUMN icono SET DEFAULT 'shop-supermarket',
  ALTER COLUMN color SET DEFAULT '#be123c';

COMMIT;
