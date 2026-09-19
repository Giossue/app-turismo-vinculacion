-- Fase 2: paquetes offline por ciudad y versiones publicables de rutas.
-- La geometría administrativa de ciudades procede de una fuente oficial;
-- no se edita manualmente desde la app turística.

CREATE TABLE IF NOT EXISTS localidad_limites_oficiales (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    localidad_id BIGINT NOT NULL REFERENCES localidades(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    version INTEGER NOT NULL CHECK (version > 0),
    fuente VARCHAR(180) NOT NULL,
    identificador_fuente VARCHAR(180),
    geometria GEOGRAPHY(MULTIPOLYGON, 4326) NOT NULL,
    checksum_sha256 CHAR(64),
    vigente BOOLEAN NOT NULL DEFAULT TRUE,
    importado_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (localidad_id, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_localidad_limite_oficial_vigente
    ON localidad_limites_oficiales (localidad_id)
    WHERE vigente;

CREATE INDEX IF NOT EXISTS idx_localidad_limite_oficial_geometria
    ON localidad_limites_oficiales USING GIST (geometria);

COMMENT ON TABLE localidad_limites_oficiales IS
    'Límites oficiales versionados (INEC/MGN u otra fuente institucional). No se dibujan en el móvil.';

CREATE TABLE IF NOT EXISTS rutas_transporte_versiones (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ruta_transporte_id BIGINT NOT NULL REFERENCES rutas_transporte(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    version INTEGER NOT NULL CHECK (version > 0),
    estado VARCHAR(20) NOT NULL DEFAULT 'BORRADOR'
        CHECK (estado IN ('BORRADOR', 'EN_REVISION', 'PUBLICADA', 'ARCHIVADA')),
    geometria GEOGRAPHY(LINESTRING, 4326) NOT NULL,
    indicaciones JSONB NOT NULL DEFAULT '[]'::jsonb
        CHECK (jsonb_typeof(indicaciones) = 'array'),
    fuente_geometria VARCHAR(20) NOT NULL DEFAULT 'ARCGIS'
        CHECK (fuente_geometria IN ('ARCGIS', 'ADMINISTRADOR', 'GIS')),
    proveedor VARCHAR(80),
    proveedor_route_id VARCHAR(180),
    creado_por BIGINT REFERENCES usuarios(id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    creado_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    publicado_at TIMESTAMPTZ,
    UNIQUE (ruta_transporte_id, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ruta_version_publicada
    ON rutas_transporte_versiones (ruta_transporte_id)
    WHERE estado = 'PUBLICADA';

CREATE INDEX IF NOT EXISTS idx_ruta_version_geometria
    ON rutas_transporte_versiones USING GIST (geometria);

CREATE INDEX IF NOT EXISTS idx_ruta_version_publicada
    ON rutas_transporte_versiones (ruta_transporte_id, estado);

COMMENT ON TABLE rutas_transporte_versiones IS
    'Geometría e indicaciones editables por versión; solo una versión PUBLICADA entra en paquetes offline.';

CREATE TABLE IF NOT EXISTS paquetes_offline_ciudad (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    localidad_id BIGINT NOT NULL REFERENCES localidades(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    version INTEGER NOT NULL CHECK (version > 0),
    estado VARCHAR(20) NOT NULL DEFAULT 'BORRADOR'
        CHECK (estado IN ('BORRADOR', 'GENERANDO', 'PUBLICADO', 'ARCHIVADO')),
    zoom_min SMALLINT NOT NULL DEFAULT 8 CHECK (zoom_min BETWEEN 0 AND 22),
    zoom_max SMALLINT NOT NULL DEFAULT 17 CHECK (zoom_max BETWEEN 0 AND 22),
    checksum_sha256 CHAR(64),
    manifiesto JSONB NOT NULL DEFAULT '{}'::jsonb
        CHECK (jsonb_typeof(manifiesto) = 'object'),
    creado_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    publicado_at TIMESTAMPTZ,
    UNIQUE (localidad_id, version),
    CHECK (zoom_max >= zoom_min)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_paquete_offline_ciudad_publicado
    ON paquetes_offline_ciudad (localidad_id)
    WHERE estado = 'PUBLICADO';

CREATE INDEX IF NOT EXISTS idx_paquete_offline_ciudad_estado
    ON paquetes_offline_ciudad (estado, localidad_id);

COMMENT ON TABLE paquetes_offline_ciudad IS
    'Metadatos de un paquete de ciudad; los tiles y archivos se almacenan en el dispositivo o MinIO, nunca en Redis.';
