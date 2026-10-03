-- Fecha del último cambio en zonas turísticas y versiones de rutas, para que la
-- versión automática de los mapas sin conexión también suba cuando cambian.
-- Aditiva e idempotente; no requiere desplegar la API antes ni backfill.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE zonas_turisticas
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE rutas_transporte_versiones
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

DO $$
DECLARE
    tabla TEXT;
BEGIN
    FOREACH tabla IN ARRAY ARRAY['zonas_turisticas', 'rutas_transporte_versiones']
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_trigger
            WHERE tgname = 'trg_' || tabla || '_updated_at'
              AND tgrelid = tabla::regclass
        ) THEN
            EXECUTE format(
                'CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at()',
                'trg_' || tabla || '_updated_at', tabla
            );
        END IF;
    END LOOP;
END;
$$;

COMMIT;
