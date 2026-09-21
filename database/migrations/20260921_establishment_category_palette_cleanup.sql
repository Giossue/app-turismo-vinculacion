-- Normaliza colores heredados fuera de la paleta pública del catastro.
-- Requiere que 20260921_establishment_category_marker_cleanup.sql ya se haya aplicado.

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

UPDATE catalogo_catastro_categorias
   SET color = '#4f46e5'
 WHERE color NOT IN (
   '#2563eb', '#0891b2', '#7c3aed', '#c026d3',
   '#ea580c', '#d97706', '#dc2626', '#4f46e5'
 );

ALTER TABLE catalogo_catastro_categorias
  DROP CONSTRAINT IF EXISTS catalogo_catastro_categorias_color_check;

ALTER TABLE catalogo_catastro_categorias
  ADD CONSTRAINT catalogo_catastro_categorias_color_check
  CHECK (color IN (
    '#2563eb', '#0891b2', '#7c3aed', '#c026d3',
    '#ea580c', '#d97706', '#dc2626', '#4f46e5'
  ));

COMMIT;
