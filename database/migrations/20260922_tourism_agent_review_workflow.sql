-- Introduce la captura operativa por AGENTE_TURISTICO y separa sus envíos
-- de la publicación pública. Los registros existentes de centros y catastro
-- permanecen bajo administración y los establecimientos existentes conservan
-- su visibilidad como PUBLICADO.

BEGIN;

INSERT INTO roles (nombre_rol)
VALUES ('AGENTE_TURISTICO')
ON CONFLICT (nombre_rol) DO NOTHING;

ALTER TABLE centros_turisticos
  ADD COLUMN IF NOT EXISTS responsable_usuario_id BIGINT
    REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_centros_responsable_usuario
  ON centros_turisticos (responsable_usuario_id, updated_at DESC);

ALTER TABLE establecimientos_turisticos
  ADD COLUMN IF NOT EXISTS responsable_usuario_id BIGINT
    REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS estado_revision VARCHAR(20) NOT NULL DEFAULT 'PUBLICADO',
  ADD COLUMN IF NOT EXISTS observacion_revision TEXT,
  ADD COLUMN IF NOT EXISTS solicitado_por BIGINT
    REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fecha_solicitud TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revisado_por BIGINT
    REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fecha_revision TIMESTAMPTZ;

ALTER TABLE establecimientos_turisticos
  DROP CONSTRAINT IF EXISTS establecimientos_turisticos_estado_revision_check;

ALTER TABLE establecimientos_turisticos
  ADD CONSTRAINT establecimientos_turisticos_estado_revision_check
  CHECK (estado_revision IN ('BORRADOR', 'EN_REVISION', 'PUBLICADO', 'RECHAZADO'));

CREATE INDEX IF NOT EXISTS idx_establecimientos_responsable_revision
  ON establecimientos_turisticos (responsable_usuario_id, estado_revision, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_establecimientos_revision_queue
  ON establecimientos_turisticos (estado_revision, fecha_solicitud DESC)
  WHERE estado_revision = 'EN_REVISION';

ALTER TABLE auditoria_catalogos
  DROP CONSTRAINT IF EXISTS auditoria_catalogos_accion_check;

ALTER TABLE auditoria_catalogos
  ADD CONSTRAINT auditoria_catalogos_accion_check
  CHECK (accion IN (
    'CREAR', 'MODIFICAR', 'ACTIVAR', 'DESACTIVAR',
    'SOLICITAR_REVISION', 'APROBAR', 'RECHAZAR'
  ));

COMMENT ON COLUMN centros_turisticos.responsable_usuario_id IS
  'Usuario operativo responsable de la captura; NULL en registros históricos administrados antes del flujo de agentes.';

COMMENT ON COLUMN establecimientos_turisticos.estado_revision IS
  'Estado de captura/publicación: los agentes solo hacen visibles sus registros después de una aprobación administrativa.';

COMMIT;
