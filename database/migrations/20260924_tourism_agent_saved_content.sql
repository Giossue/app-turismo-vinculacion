-- Saved plans and explicit chat-history consent for the tourism agent.
-- Existing conversations are not opted in or copied into this feature.
CREATE TABLE IF NOT EXISTS itinerarios_usuario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    titulo VARCHAR(160) NOT NULL CHECK (length(btrim(titulo)) > 0),
    resumen VARCHAR(500) NOT NULL CHECK (length(btrim(resumen)) > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_itinerarios_usuario_updated
    ON itinerarios_usuario (usuario_id, updated_at DESC, id);

CREATE TABLE IF NOT EXISTS itinerario_jornadas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    itinerario_id UUID NOT NULL REFERENCES itinerarios_usuario(id) ON UPDATE CASCADE ON DELETE CASCADE,
    orden SMALLINT NOT NULL CHECK (orden BETWEEN 1 AND 7),
    fecha DATE,
    UNIQUE (itinerario_id, orden)
);

CREATE TABLE IF NOT EXISTS itinerario_paradas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    jornada_id BIGINT NOT NULL REFERENCES itinerario_jornadas(id) ON UPDATE CASCADE ON DELETE CASCADE,
    centro_turistico_id BIGINT NOT NULL REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    orden SMALLINT NOT NULL CHECK (orden BETWEEN 1 AND 6),
    UNIQUE (jornada_id, orden),
    UNIQUE (jornada_id, centro_turistico_id)
);

CREATE INDEX IF NOT EXISTS idx_itinerario_paradas_centro
    ON itinerario_paradas (centro_turistico_id);

-- The old chat tables predate explicit consent. Only rows created through the
-- opt-in API after this migration receive an enabled preference.
CREATE TABLE IF NOT EXISTS preferencias_historial_ia (
    usuario_id BIGINT PRIMARY KEY REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    habilitado BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE conversaciones_ia
    ADD COLUMN IF NOT EXISTS historial_voluntario BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE conversaciones_ia
    ADD COLUMN IF NOT EXISTS public_id UUID NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversaciones_ia_public_id
    ON conversaciones_ia (public_id);

ALTER TABLE mensajes_ia
    ADD COLUMN IF NOT EXISTS fuentes_publicas JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_conversaciones_ia_voluntarias_usuario
    ON conversaciones_ia (usuario_id, updated_at DESC, id DESC)
    WHERE historial_voluntario;

CREATE INDEX IF NOT EXISTS idx_mensajes_ia_conversacion_orden
    ON mensajes_ia (conversacion_id, id);
