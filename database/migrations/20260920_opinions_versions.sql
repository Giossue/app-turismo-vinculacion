-- Opiniones versionadas y moderación sin estado OCULTA.
--
-- Precondición operativa: tomar un respaldo de PostgreSQL antes de ejecutar.
-- La transformación conserva el contenido existente en la primera versión; los
-- antiguos estados OCULTA se convierten en RECHAZADA para que nunca vuelvan a
-- publicarse. El despliegue debe aplicar este archivo antes de la nueva API.
--
-- La migración se ejecuta dentro de una transacción. No hay rollback automático
-- porque la limpieza de las columnas antiguas es destructiva; el rollback de una
-- operación en producción requiere restaurar el respaldo y retirar la versión de
-- la API que usa opinion_versiones.

BEGIN;

CREATE TABLE IF NOT EXISTS opinion_versiones (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo_publico UUID NOT NULL UNIQUE,
    opinion_id BIGINT NOT NULL REFERENCES opiniones(id) ON UPDATE CASCADE ON DELETE CASCADE,
    numero_version SMALLINT NOT NULL,
    calificacion SMALLINT,
    comentario TEXT,
    estado_moderacion VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revisado_at TIMESTAMPTZ NULL,
    CONSTRAINT opinion_versiones_version_check CHECK (numero_version >= 1),
    CONSTRAINT opinion_versiones_calificacion_check CHECK (
        calificacion IS NULL OR calificacion BETWEEN 1 AND 5
    ),
    CONSTRAINT opinion_versiones_estado_check CHECK (
        estado_moderacion IN ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'REEMPLAZADA')
    ),
    CONSTRAINT opinion_versiones_contenido_check CHECK (
        calificacion IS NOT NULL OR NULLIF(BTRIM(comentario), '') IS NOT NULL
    ),
    CONSTRAINT opinion_versiones_opinion_version_key UNIQUE (opinion_id, id),
    CONSTRAINT opinion_versiones_opinion_numero_key UNIQUE (opinion_id, numero_version)
);

ALTER TABLE opiniones
    ADD COLUMN IF NOT EXISTS version_publicada_id BIGINT;

ALTER TABLE moderaciones_opinion
    ADD COLUMN IF NOT EXISTS opinion_version_id BIGINT;

-- La instalación original guardaba el envío directamente en opiniones. Se migra
-- cada fila a la versión 1 con un código público determinista y no reversible.
-- Si este archivo ya se ejecutó, las columnas antiguas ya no existen y el bloque
-- debe ser un no-op para que el arranque local pueda reaplicar migraciones.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
          FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'opiniones'
           AND column_name = 'calificacion'
    ) AND EXISTS (
        SELECT 1
          FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'opiniones'
           AND column_name = 'comentario'
    ) THEN
        EXECUTE $copy$
            INSERT INTO opinion_versiones (
                codigo_publico,
                opinion_id,
                numero_version,
                calificacion,
                comentario,
                estado_moderacion,
                created_at,
                revisado_at
            )
            SELECT
                MD5('turismo-opinion-version:' || o.id::text)::uuid,
                o.id,
                1,
                o.calificacion,
                o.comentario,
                CASE
                    WHEN o.estado_moderacion = 'OCULTA' THEN 'RECHAZADA'
                    ELSE o.estado_moderacion
                END,
                o.created_at,
                CASE
                    WHEN o.estado_moderacion IN ('APROBADA', 'RECHAZADA', 'OCULTA')
                        THEN o.updated_at
                    ELSE NULL
                END
            FROM opiniones o
            WHERE NOT EXISTS (
                SELECT 1
                  FROM opinion_versiones v
                 WHERE v.opinion_id = o.id
            )
        $copy$;
    END IF;
END;
$$;

UPDATE opiniones o
   SET estado_moderacion = CASE
       WHEN o.estado_moderacion = 'OCULTA' THEN 'RECHAZADA'
       ELSE o.estado_moderacion
   END;

UPDATE opiniones o
   SET version_publicada_id = v.id
  FROM opinion_versiones v
 WHERE v.opinion_id = o.id
   AND v.numero_version = 1
   AND v.estado_moderacion = 'APROBADA';

UPDATE moderaciones_opinion m
   SET opinion_version_id = v.id
  FROM opinion_versiones v
 WHERE v.opinion_id = m.opinion_id
   AND v.numero_version = 1
   AND m.opinion_version_id IS NULL;

-- Conservamos la auditoría histórica, pero el flujo nuevo solo admite aprobar o
-- rechazar. Las acciones antiguas se traducen a la semántica vigente.
UPDATE moderaciones_opinion
   SET accion = CASE accion
       WHEN 'OCULTAR' THEN 'RECHAZAR'
       WHEN 'RESTAURAR' THEN 'APROBAR'
       ELSE accion
   END;

ALTER TABLE opiniones
    DROP CONSTRAINT IF EXISTS opiniones_calificacion_check,
    DROP CONSTRAINT IF EXISTS opiniones_check1,
    DROP CONSTRAINT IF EXISTS opiniones_estado_moderacion_check;

ALTER TABLE moderaciones_opinion
    DROP CONSTRAINT IF EXISTS moderaciones_opinion_accion_check;

-- Las columnas antiguas duplican el contenido que ahora vive en
-- opinion_versiones. Se eliminan después de la copia para dejar una sola fuente
-- de verdad por versión.
ALTER TABLE opiniones
    DROP COLUMN IF EXISTS calificacion,
    DROP COLUMN IF EXISTS comentario;

ALTER TABLE opiniones
    ADD CONSTRAINT opiniones_estado_moderacion_check CHECK (
        estado_moderacion IN ('PENDIENTE', 'APROBADA', 'RECHAZADA')
    );

ALTER TABLE moderaciones_opinion
    ALTER COLUMN opinion_version_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conname = 'opiniones_version_publicada_id_fkey'
           AND conrelid = 'public.opiniones'::regclass
    ) THEN
        ALTER TABLE opiniones
            ADD CONSTRAINT opiniones_version_publicada_id_fkey
            FOREIGN KEY (version_publicada_id)
            REFERENCES opinion_versiones(id)
            ON UPDATE CASCADE
            ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conname = 'moderaciones_opinion_version_id_fkey'
           AND conrelid = 'public.moderaciones_opinion'::regclass
    ) THEN
        ALTER TABLE moderaciones_opinion
            ADD CONSTRAINT moderaciones_opinion_version_id_fkey
            FOREIGN KEY (opinion_version_id)
            REFERENCES opinion_versiones(id)
            ON UPDATE CASCADE
            ON DELETE CASCADE;
    END IF;
END;
$$;

ALTER TABLE moderaciones_opinion
    ADD CONSTRAINT moderaciones_opinion_accion_check CHECK (
        accion IN ('APROBAR', 'RECHAZAR')
    );

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
          FROM opiniones
         WHERE centro_turistico_id IS NOT NULL
           AND estado_moderacion IN ('PENDIENTE', 'APROBADA')
         GROUP BY usuario_id, centro_turistico_id
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION
            'No se puede crear la unicidad de opiniones activas para centros: existen duplicados';
    END IF;

    IF EXISTS (
        SELECT 1
          FROM opiniones
         WHERE punto_interes_id IS NOT NULL
           AND estado_moderacion IN ('PENDIENTE', 'APROBADA')
         GROUP BY usuario_id, punto_interes_id
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION
            'No se puede crear la unicidad de opiniones activas para puntos: existen duplicados';
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_opiniones_activas_centro
    ON opiniones (usuario_id, centro_turistico_id)
    WHERE centro_turistico_id IS NOT NULL
      AND estado_moderacion IN ('PENDIENTE', 'APROBADA');

CREATE UNIQUE INDEX IF NOT EXISTS uq_opiniones_activas_punto
    ON opiniones (usuario_id, punto_interes_id)
    WHERE punto_interes_id IS NOT NULL
      AND estado_moderacion IN ('PENDIENTE', 'APROBADA');

CREATE UNIQUE INDEX IF NOT EXISTS uq_opinion_version_pendiente
    ON opinion_versiones (opinion_id)
    WHERE estado_moderacion = 'PENDIENTE';

CREATE UNIQUE INDEX IF NOT EXISTS uq_opinion_version_aprobada
    ON opinion_versiones (opinion_id)
    WHERE estado_moderacion = 'APROBADA';

CREATE INDEX IF NOT EXISTS idx_opinion_versiones_estado_created
    ON opinion_versiones (estado_moderacion, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_opinion_versiones_opinion_created
    ON opinion_versiones (opinion_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_moderaciones_opinion_version_created
    ON moderaciones_opinion (opinion_version_id, created_at DESC, id DESC);

COMMENT ON TABLE opinion_versiones IS
    'Versiones inmutables de una opinión; solo una puede estar publicada por opinión lógica.';

COMMENT ON COLUMN opiniones.version_publicada_id IS
    'Versión aprobada visible públicamente; puede mantenerse mientras otra versión está pendiente.';

COMMIT;
