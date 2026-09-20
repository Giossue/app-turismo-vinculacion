-- Extiende la auditoría inmutable existente para mutaciones del catastro.
-- No crea tablas ni columnas: reutiliza auditoria_catalogos con un discriminador explícito.

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE auditoria_catalogos
  DROP CONSTRAINT IF EXISTS auditoria_catalogos_catalogo_codigo_check;

ALTER TABLE auditoria_catalogos
  ADD CONSTRAINT auditoria_catalogos_catalogo_codigo_check
  CHECK (catalogo_codigo IN ('ACCESSIBILITY', 'ACTIVITY', 'FACILITY', 'ESTABLISHMENT'));

ALTER TABLE auditoria_catalogos
  DROP CONSTRAINT IF EXISTS auditoria_catalogos_accion_check;

ALTER TABLE auditoria_catalogos
  ADD CONSTRAINT auditoria_catalogos_accion_check
  CHECK (accion IN ('CREAR', 'MODIFICAR', 'ACTIVAR', 'DESACTIVAR'));

COMMENT ON COLUMN auditoria_catalogos.catalogo_codigo IS
  'Código del catálogo o agregado administrativo auditado; ESTABLISHMENT identifica establecimientos_turisticos.';

COMMIT;
