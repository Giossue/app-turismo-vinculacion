-- Normaliza los valores visuales heredados de categorías de catastro.
-- Requiere que 20260921_ab_establishment_category_visuals.sql ya se haya aplicado.
-- No elimina categorías ni establecimientos; el rollback operativo consiste en
-- restaurar el respaldo de la tabla antes de reaplicar la restricción anterior.

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

UPDATE catalogo_catastro_categorias
   SET icono = 'hotel'
 WHERE icono = 'mapPin';

ALTER TABLE catalogo_catastro_categorias
  ALTER COLUMN icono SET DEFAULT 'hotel';

ALTER TABLE catalogo_catastro_categorias
  DROP CONSTRAINT IF EXISTS catalogo_catastro_categorias_icono_check;

ALTER TABLE catalogo_catastro_categorias
  ADD CONSTRAINT catalogo_catastro_categorias_icono_check
  CHECK (icono IN (
    'hotel', 'restaurant', 'coffee', 'store', 'bus', 'ticket', 'briefcase',
    'accommodation-hotel', 'amenity-cinema', 'amenity-library', 'amenity-toilets',
    'eat-drink-cafe', 'eat-drink-restaurant', 'health-hospital', 'money-atm',
    'money-bank', 'outdoor-camping', 'outdoor-drinking-water',
    'religious-place-of-worship', 'shop-supermarket', 'tourism-information',
    'tourism-monument', 'tourism-museum', 'tourism-viewpoint', 'transport-bus-stop'
  ));

COMMIT;
