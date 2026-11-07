-- Constancias de aceptación de los documentos legales y marca de eliminación de cuentas.
-- Aditiva e idempotente: no crea constancias retroactivas ni modifica filas existentes,
-- de modo que las cuentas anteriores quedan sin aceptación registrada.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE IF NOT EXISTS aceptaciones_legales (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    documento VARCHAR(20) NOT NULL CHECK (documento IN ('terms', 'privacy')),
    version VARCHAR(32) NOT NULL CHECK (length(btrim(version)) > 0),
    aceptado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version_app VARCHAR(32)
);

-- Resuelve repetición y concurrencia: la API inserta con ON CONFLICT DO NOTHING.
CREATE UNIQUE INDEX IF NOT EXISTS uq_aceptaciones_legales_cuenta_documento_version
    ON aceptaciones_legales (usuario_id, documento, version);

COMMENT ON TABLE aceptaciones_legales IS
  'Constancia por cuenta, documento y versión aceptada. La API solo inserta; sobrevive a la eliminación de la cuenta.';
COMMENT ON COLUMN aceptaciones_legales.aceptado_en IS
  'Hora del servidor; nunca proviene del cliente.';
COMMENT ON COLUMN aceptaciones_legales.version_app IS
  'Versión de la app declarada por el cliente, si la envió.';

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS eliminado_at TIMESTAMPTZ;
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_eliminado_inactivo_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_eliminado_inactivo_check
  CHECK (eliminado_at IS NULL OR activo = FALSE);

COMMENT ON COLUMN usuarios.eliminado_at IS
  'Fecha en que el titular eliminó la cuenta; la fila queda anonimizada y conserva las referencias.';

COMMIT;
