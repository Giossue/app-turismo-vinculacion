-- Reserva tourism-monument para los centros turísticos de la aplicación.
-- Los catastros conservan los demás pines Osmic; el panel no puede asignar este.

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

ALTER TABLE catalogo_catastro_clasificaciones
  DROP CONSTRAINT IF EXISTS catalogo_catastro_clasificaciones_icono_check;

ALTER TABLE catalogo_catastro_categorias
  DROP CONSTRAINT IF EXISTS catalogo_catastro_categorias_icono_check;

UPDATE catalogo_catastro_clasificaciones
   SET icono = 'shop-supermarket',
       color = '#be123c'
 WHERE icono = 'tourism-monument';

UPDATE catalogo_catastro_categorias
   SET icono = 'shop-supermarket',
       color = '#be123c'
 WHERE icono = 'tourism-monument';

ALTER TABLE catalogo_catastro_clasificaciones
  ADD CONSTRAINT catalogo_catastro_clasificaciones_icono_check
  CHECK (icono IN (
    'accommodation-hotel', 'amenity-cinema', 'amenity-library',
    'amenity-toilets', 'eat-drink-cafe', 'eat-drink-restaurant',
    'health-hospital', 'money-atm', 'money-bank', 'outdoor-camping',
    'outdoor-drinking-water', 'religious-place-of-worship',
    'shop-supermarket', 'tourism-information', 'tourism-museum',
    'tourism-viewpoint', 'transport-bus-stop'
  ));

ALTER TABLE catalogo_catastro_categorias
  ADD CONSTRAINT catalogo_catastro_categorias_icono_check
  CHECK (icono IN (
    'accommodation-hotel', 'amenity-cinema', 'amenity-library',
    'amenity-toilets', 'eat-drink-cafe', 'eat-drink-restaurant',
    'health-hospital', 'money-atm', 'money-bank', 'outdoor-camping',
    'outdoor-drinking-water', 'religious-place-of-worship',
    'shop-supermarket', 'tourism-information', 'tourism-museum',
    'tourism-viewpoint', 'transport-bus-stop'
  ));

COMMIT;
