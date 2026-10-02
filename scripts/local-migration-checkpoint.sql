-- Adopta una base local anterior al ledger únicamente después de verificar
-- que la migración de eliminación lógica está completamente aplicada.
WITH marked_tables AS (
  SELECT unnest(ARRAY[
    'centros_turisticos', 'establecimientos_turisticos',
    'tipos_accesibilidad', 'actividades_turisticas', 'tipos_facilidad',
    'catalogo_catastro_clasificaciones', 'catalogo_catastro_categorias', 'opiniones'
  ]) AS table_name
), inactive_tables AS (
  SELECT table_name FROM marked_tables WHERE table_name <> 'opiniones'
), audit_tables AS (
  SELECT unnest(ARRAY['auditoria_fichas', 'auditoria_catalogos', 'moderaciones_opinion']) AS table_name
), opinion_indexes AS (
  SELECT unnest(ARRAY['uq_opiniones_activas_centro', 'uq_opiniones_activas_punto']) AS index_name
)
SELECT
  NOT EXISTS (
    SELECT 1 FROM marked_tables required
    WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.columns installed
      WHERE installed.table_schema = 'public'
        AND installed.table_name = required.table_name
        AND installed.column_name = 'eliminado_at'
        AND installed.data_type = 'timestamp with time zone'
    )
  ) AND NOT EXISTS (
    SELECT 1 FROM inactive_tables required
    WHERE NOT EXISTS (
      SELECT 1 FROM pg_constraint installed
      WHERE installed.conrelid = to_regclass('public.' || required.table_name)
        AND installed.conname = required.table_name || '_eliminado_inactivo_check'
        AND installed.contype = 'c' AND installed.convalidated
        AND lower(regexp_replace(pg_get_expr(installed.conbin, installed.conrelid), '[[:space:]()]', '', 'g'))
              = 'eliminado_atisnulloractivo=false'
    )
  ) AND NOT EXISTS (
    SELECT 1 FROM audit_tables required
    WHERE NOT EXISTS (
      SELECT 1 FROM pg_constraint installed
      WHERE installed.conrelid = to_regclass('public.' || required.table_name)
        AND installed.conname = required.table_name || '_accion_check'
        AND installed.contype = 'c' AND installed.convalidated
        AND strpos(pg_get_expr(installed.conbin, installed.conrelid), '''ELIMINAR''') > 0
    )
  ) AND NOT EXISTS (
    SELECT 1 FROM opinion_indexes required
    WHERE NOT EXISTS (
      SELECT 1 FROM pg_index installed
      WHERE installed.indexrelid = to_regclass('public.' || required.index_name)
        AND installed.indrelid = to_regclass('public.opiniones')
        AND installed.indisunique AND installed.indisvalid AND installed.indisready
        AND strpos(pg_get_expr(installed.indpred, installed.indrelid), 'eliminado_at IS NULL') > 0
    )
  ) AS local_checkpoint_complete
\gset
\if :local_checkpoint_complete
\else
DO $$ BEGIN
  RAISE EXCEPTION 'La base local no tiene historial de migraciones ni un checkpoint de eliminación completo.'
    USING HINT = 'Verifica las migraciones anteriores y aplica 20261002_admin_logical_deletion.sql una vez antes de reiniciar. No vuelvas a ejecutar los seeds ni las restricciones antiguas.';
END $$;
\endif
