-- Favoritos y fotografías por establecimiento del catastro. Cada fotografía pertenece a un
-- establecimiento concreto, no a su actividad, clasificación ni categoría. El binario vive
-- en el proveedor de objetos y PostgreSQL conserva solo metadatos y la clave opaca.
-- Aditiva e idempotente; no requiere backfill.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE IF NOT EXISTS favoritos_establecimientos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE CASCADE,
    establecimiento_id BIGINT NOT NULL REFERENCES establecimientos_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (usuario_id, establecimiento_id)
);

CREATE INDEX IF NOT EXISTS idx_favoritos_establecimientos_usuario_created
    ON favoritos_establecimientos (usuario_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_favoritos_establecimientos_establecimiento
    ON favoritos_establecimientos (establecimiento_id);

-- Solo fotografías: no necesita el catálogo tipos_archivo_centro_turistico.
CREATE TABLE IF NOT EXISTS archivos_establecimiento_turistico (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    establecimiento_id BIGINT NOT NULL REFERENCES establecimientos_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    nombre_original VARCHAR(255) NOT NULL,
    ruta_archivo TEXT NOT NULL,
    proveedor_almacenamiento VARCHAR(30) NOT NULL CHECK (proveedor_almacenamiento IN ('LOCAL', 'S3', 'CLOUDINARY', 'OTRO')),
    checksum_sha256 CHAR(64) CHECK (checksum_sha256 IS NULL OR checksum_sha256 ~ '^[0-9a-fA-F]{64}$'),
    mime_type VARCHAR(100) NOT NULL,
    tamano_bytes BIGINT CHECK (tamano_bytes IS NULL OR tamano_bytes >= 0),
    fuente_autor VARCHAR(250),
    descripcion TEXT,
    orden SMALLINT,
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
        CONSTRAINT archivos_establecimiento_turistico_estado_check
        CHECK (estado IN ('PENDIENTE', 'PUBLICADO', 'ELIMINADO')),
    subido_por BIGINT REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    eliminado_por BIGINT REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    eliminado_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_archivos_establecimiento_estado
    ON archivos_establecimiento_turistico (establecimiento_id, estado, orden, created_at);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trg_archivos_establecimiento_turistico_updated_at'
          AND tgrelid = 'archivos_establecimiento_turistico'::regclass
    ) THEN
        CREATE TRIGGER trg_archivos_establecimiento_turistico_updated_at
        BEFORE UPDATE ON archivos_establecimiento_turistico
        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
    END IF;
END;
$$;

-- La auditoría del catastro (auditoria_catalogos, ESTABLISHMENT) también registra fotografías.
ALTER TABLE auditoria_catalogos DROP CONSTRAINT IF EXISTS auditoria_catalogos_accion_check;
ALTER TABLE auditoria_catalogos ADD CONSTRAINT auditoria_catalogos_accion_check
  CHECK (accion IN (
    'CREAR', 'MODIFICAR', 'ACTIVAR', 'DESACTIVAR',
    'SOLICITAR_REVISION', 'APROBAR', 'RECHAZAR', 'ELIMINAR',
    'AGREGAR_MULTIMEDIA', 'ELIMINAR_MULTIMEDIA', 'PUBLICAR_MULTIMEDIA'
  ));

COMMIT;
