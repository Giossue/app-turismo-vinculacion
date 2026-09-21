-- Configuración visual administrable para categorías del catastro.
-- Los valores están restringidos porque se consumen en capas públicas del mapa.

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE auditoria_catalogos
  DROP CONSTRAINT IF EXISTS auditoria_catalogos_catalogo_codigo_check;

ALTER TABLE auditoria_catalogos
  ADD CONSTRAINT auditoria_catalogos_catalogo_codigo_check
  CHECK (catalogo_codigo IN ('ACCESSIBILITY', 'ACTIVITY', 'FACILITY', 'ESTABLISHMENT_CATEGORY', 'ESTABLISHMENT'));

ALTER TABLE catalogo_catastro_categorias
  ADD COLUMN IF NOT EXISTS icono VARCHAR(40) NOT NULL DEFAULT 'mapPin',
  ADD COLUMN IF NOT EXISTS color VARCHAR(7) NOT NULL DEFAULT '#2563eb';

ALTER TABLE catalogo_catastro_categorias
  DROP CONSTRAINT IF EXISTS catalogo_catastro_categorias_icono_check;

ALTER TABLE catalogo_catastro_categorias
  ADD CONSTRAINT catalogo_catastro_categorias_icono_check
  CHECK (icono IN ('mapPin', 'hotel', 'restaurant', 'coffee', 'store', 'bus', 'ticket', 'briefcase'));

ALTER TABLE catalogo_catastro_categorias
  DROP CONSTRAINT IF EXISTS catalogo_catastro_categorias_color_check;

ALTER TABLE catalogo_catastro_categorias
  ADD CONSTRAINT catalogo_catastro_categorias_color_check
  CHECK (color ~ '^#[0-9A-Fa-f]{6}$');

COMMENT ON COLUMN catalogo_catastro_categorias.icono IS
  'Código visual permitido para el marcador público del establecimiento.';
COMMENT ON COLUMN catalogo_catastro_categorias.color IS
  'Color hexadecimal del marcador público del establecimiento.';

COMMIT;
