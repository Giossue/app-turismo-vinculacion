-- Datos del catastro nacional MINTUR que no tenían columna propia.
-- `datos_mintur` conserva la fila original (encabezado → valor) para que la
-- importación no pierda ninguna de las 91 columnas del consolidado.
-- Aditiva e idempotente; aplicar antes de la API que importa el catastro.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

ALTER TABLE establecimientos_turisticos
    ADD COLUMN IF NOT EXISTS codigo_establecimiento_ruc VARCHAR(10),
    ADD COLUMN IF NOT EXISTS referencia_direccion TEXT,
    ADD COLUMN IF NOT EXISTS telefono_secundario VARCHAR(25),
    ADD COLUMN IF NOT EXISTS correo VARCHAR(254),
    ADD COLUMN IF NOT EXISTS sitio_web VARCHAR(300),
    ADD COLUMN IF NOT EXISTS estado_registro_mintur VARCHAR(30),
    ADD COLUMN IF NOT EXISTS fecha_registro_mintur DATE,
    ADD COLUMN IF NOT EXISTS total_trabajadores INTEGER,
    ADD COLUMN IF NOT EXISTS total_habitaciones INTEGER,
    ADD COLUMN IF NOT EXISTS total_camas INTEGER,
    ADD COLUMN IF NOT EXISTS total_plazas INTEGER,
    ADD COLUMN IF NOT EXISTS total_mesas INTEGER,
    ADD COLUMN IF NOT EXISTS capacidad_personas INTEGER,
    ADD COLUMN IF NOT EXISTS datos_mintur JSONB,
    ADD COLUMN IF NOT EXISTS importado_mintur_at TIMESTAMPTZ;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conname = 'chk_establecimientos_estado_registro_mintur'
    ) THEN
        ALTER TABLE establecimientos_turisticos
            ADD CONSTRAINT chk_establecimientos_estado_registro_mintur
            CHECK (estado_registro_mintur IS NULL OR estado_registro_mintur IN (
                'RATIFICADO', 'PENDIENTE_INSPECCION', 'SUSPENSION_TEMPORAL',
                'SUSPENSION_DEFINITIVA', 'INACTIVO'
            ));
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conname = 'chk_establecimientos_capacidades_mintur'
    ) THEN
        ALTER TABLE establecimientos_turisticos
            ADD CONSTRAINT chk_establecimientos_capacidades_mintur
            CHECK (
                COALESCE(total_trabajadores, 0) >= 0
                AND COALESCE(total_habitaciones, 0) >= 0
                AND COALESCE(total_camas, 0) >= 0
                AND COALESCE(total_plazas, 0) >= 0
                AND COALESCE(total_mesas, 0) >= 0
                AND COALESCE(capacidad_personas, 0) >= 0
            );
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_establecimientos_estado_registro_mintur
    ON establecimientos_turisticos (estado_registro_mintur)
    WHERE eliminado_at IS NULL;

COMMIT;
