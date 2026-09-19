-- Auditoría inmutable para cambios administrativos en catálogos.
CREATE TABLE IF NOT EXISTS auditoria_catalogos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    catalogo_codigo VARCHAR(30) NOT NULL CHECK (catalogo_codigo IN ('ACCESSIBILITY', 'ACTIVITY', 'FACILITY')),
    registro_id BIGINT NOT NULL,
    accion VARCHAR(20) NOT NULL CHECK (accion IN ('MODIFICAR', 'ACTIVAR', 'DESACTIVAR')),
    datos_anteriores JSONB NOT NULL DEFAULT '{}'::JSONB,
    datos_nuevos JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auditoria_catalogos_registro
    ON auditoria_catalogos (catalogo_codigo, registro_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_auditoria_catalogos_inmutable ON auditoria_catalogos;
CREATE TRIGGER trg_auditoria_catalogos_inmutable
BEFORE UPDATE OR DELETE ON auditoria_catalogos
FOR EACH ROW EXECUTE FUNCTION fn_impedir_cambio_auditoria();
