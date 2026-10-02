-- Eliminación lógica separada de la desactivación reversible.
-- Aplicar después de todas las migraciones anteriores y antes de la API/web.
-- Conserva filas, identificadores, relaciones, versiones y auditoría existentes.
BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $$
DECLARE
  target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'centros_turisticos', 'establecimientos_turisticos',
    'tipos_accesibilidad', 'actividades_turisticas', 'tipos_facilidad',
    'catalogo_catastro_clasificaciones', 'catalogo_catastro_categorias'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS eliminado_at timestamptz', target_table);
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', target_table, target_table || '_eliminado_inactivo_check');
    EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I CHECK (eliminado_at IS NULL OR activo = FALSE)', target_table, target_table || '_eliminado_inactivo_check');
    EXECUTE format('COMMENT ON COLUMN %I.eliminado_at IS %L', target_table, 'Fecha de eliminación lógica; conserva el historial y excluye el registro del panel.');
  END LOOP;
END;
$$;

ALTER TABLE opiniones ADD COLUMN IF NOT EXISTS eliminado_at timestamptz;
COMMENT ON COLUMN opiniones.eliminado_at IS
  'Fecha de eliminación lógica de la opinión completa; conserva todas sus versiones y moderaciones.';

ALTER TABLE auditoria_fichas DROP CONSTRAINT IF EXISTS auditoria_fichas_accion_check;
ALTER TABLE auditoria_fichas ADD CONSTRAINT auditoria_fichas_accion_check
  CHECK (accion IN (
    'CREAR', 'MODIFICAR', 'SOLICITAR_REVISION', 'APROBAR', 'RECHAZAR',
    'PUBLICAR', 'DESACTIVAR', 'REACTIVAR', 'AGREGAR_MULTIMEDIA',
    'ELIMINAR_MULTIMEDIA', 'PUBLICAR_MULTIMEDIA', 'ELIMINAR'
  ));

ALTER TABLE auditoria_catalogos DROP CONSTRAINT IF EXISTS auditoria_catalogos_accion_check;
ALTER TABLE auditoria_catalogos ADD CONSTRAINT auditoria_catalogos_accion_check
  CHECK (accion IN (
    'CREAR', 'MODIFICAR', 'ACTIVAR', 'DESACTIVAR',
    'SOLICITAR_REVISION', 'APROBAR', 'RECHAZAR', 'ELIMINAR'
  ));

ALTER TABLE moderaciones_opinion DROP CONSTRAINT IF EXISTS moderaciones_opinion_accion_check;
ALTER TABLE moderaciones_opinion ADD CONSTRAINT moderaciones_opinion_accion_check
  CHECK (accion IN ('APROBAR', 'RECHAZAR', 'ELIMINAR'));

-- La opinión eliminada conserva sus versiones y permite al autor crear una nueva.
DROP INDEX IF EXISTS uq_opiniones_activas_centro;
CREATE UNIQUE INDEX uq_opiniones_activas_centro
  ON opiniones (usuario_id, centro_turistico_id)
  WHERE centro_turistico_id IS NOT NULL
    AND estado_moderacion IN ('PENDIENTE', 'APROBADA')
    AND eliminado_at IS NULL;

DROP INDEX IF EXISTS uq_opiniones_activas_punto;
CREATE UNIQUE INDEX uq_opiniones_activas_punto
  ON opiniones (usuario_id, punto_interes_id)
  WHERE punto_interes_id IS NOT NULL
    AND estado_moderacion IN ('PENDIENTE', 'APROBADA')
    AND eliminado_at IS NULL;

COMMIT;
