-- Reserva el azul de ubicación actual para evitar confusión en el mapa móvil.
-- Requiere respaldo previo de catalogo_catastro_categorias.
-- Las categorías que usaban azul pasan a violeta y no se elimina ningún registro.

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

UPDATE catalogo_catastro_categorias
   SET color = '#7c3aed'
 WHERE LOWER(color) = '#2563eb';

ALTER TABLE catalogo_catastro_categorias
  ALTER COLUMN color SET DEFAULT '#7c3aed';

ALTER TABLE catalogo_catastro_categorias
  DROP CONSTRAINT IF EXISTS catalogo_catastro_categorias_color_check;

ALTER TABLE catalogo_catastro_categorias
  ADD CONSTRAINT catalogo_catastro_categorias_color_check
  CHECK (color IN (
    '#0891b2', '#7c3aed', '#c026d3', '#ea580c',
    '#d97706', '#dc2626', '#4f46e5',
    '#7a5c3e', '#7e22ce', '#334155', '#64748b', '#8b5e34', '#b45309',
    '#9f1239', '#475569', '#374151', '#3f6212', '#0f766e', '#6d28d9',
    '#be123c', '#0369a1', '#92400e', '#5b21b6', '#a16207', '#155e75'
  ));

COMMIT;
