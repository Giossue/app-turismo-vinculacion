-- Borradores administrativos aislados de la versión pública.
-- Cada centro conserva como máximo un borrador editable; las revisiones enviadas
-- se copian en revisiones_publicacion para mantener un historial inmutable.

CREATE TABLE IF NOT EXISTS borradores_centros_turisticos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL UNIQUE
        REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    estado_resenia_id BIGINT NOT NULL
        REFERENCES estados_resenia(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    datos JSONB NOT NULL DEFAULT '{}'::JSONB
        CHECK (jsonb_typeof(datos) = 'object'),
    actualizado_por BIGINT NOT NULL
        REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_borradores_centros_estado
    ON borradores_centros_turisticos (estado_resenia_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_borradores_centros_usuario
    ON borradores_centros_turisticos (actualizado_por, updated_at DESC);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trg_borradores_centros_updated_at'
    ) THEN
        CREATE TRIGGER trg_borradores_centros_updated_at
        BEFORE UPDATE ON borradores_centros_turisticos
        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
    END IF;
END;
$$;
