-- Multimedia de fichas: el binario vive en el proveedor de objetos y PostgreSQL conserva
-- únicamente metadatos, estado y la clave opaca generada por el servidor.
ALTER TABLE archivos_centro_turistico
  ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
  ADD COLUMN IF NOT EXISTS subido_por BIGINT REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS eliminado_por BIGINT REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS eliminado_at TIMESTAMPTZ;

ALTER TABLE archivos_centro_turistico
  DROP CONSTRAINT IF EXISTS archivos_centro_turistico_estado_check;
ALTER TABLE archivos_centro_turistico
  ADD CONSTRAINT archivos_centro_turistico_estado_check
  CHECK (estado IN ('PENDIENTE', 'PUBLICADO', 'ELIMINADO'));

ALTER TABLE auditoria_fichas
  DROP CONSTRAINT IF EXISTS auditoria_fichas_accion_check;
ALTER TABLE auditoria_fichas
  ADD CONSTRAINT auditoria_fichas_accion_check
  CHECK (accion IN (
    'CREAR', 'MODIFICAR', 'SOLICITAR_REVISION', 'APROBAR', 'RECHAZAR',
    'PUBLICAR', 'DESACTIVAR', 'REACTIVAR', 'AGREGAR_MULTIMEDIA',
    'ELIMINAR_MULTIMEDIA', 'PUBLICAR_MULTIMEDIA'
  ));

CREATE INDEX IF NOT EXISTS idx_archivos_centro_estado
  ON archivos_centro_turistico (centro_turistico_id, estado, orden, created_at);

INSERT INTO tipos_archivo_centro_turistico (codigo, nombre)
VALUES ('VIDEO', 'Video'), ('AUDIO', 'Audio')
ON CONFLICT (codigo) DO NOTHING;
