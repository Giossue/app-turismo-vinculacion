-- Tres estados editoriales actuales; activación independiente y decisiones históricas.
-- Aplicar con la API del flujo atómico, mutaciones pausadas y respaldo previo.
-- No publica borradores ni reescribe revisiones/auditoría históricas.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

LOCK TABLE estados_resenia, centros_turisticos, borradores_centros_turisticos, revisiones_publicacion
    IN SHARE ROW EXCLUSIVE MODE;

DO $$
BEGIN
    IF (SELECT COUNT(*) FROM estados_resenia
        WHERE codigo IN ('BORRADOR', 'EN_REVISION', 'PUBLICADO')) <> 3 THEN
        RAISE EXCEPTION 'Faltan estados base del flujo de centros.';
    END IF;
END;
$$;

-- Conserva generación de código institucional y secuencia por parroquia.
-- activo ya no fuerza INACTIVO ni modifica el estado editorial.
CREATE OR REPLACE FUNCTION fn_preparar_centro_turistico()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_codigo_provincia CHAR(2);
    v_codigo_canton CHAR(2);
    v_codigo_parroquia CHAR(2);
    v_codigo_categoria CHAR(2);
    v_codigo_tipo CHAR(2);
    v_codigo_subtipo CHAR(2);
    v_codigo_jerarquia CHAR(2);
BEGIN
    IF TG_OP = 'INSERT' AND NEW.secuencial_atractivo IS NULL THEN
        PERFORM 1 FROM parroquias WHERE id = NEW.parroquia_id FOR UPDATE;
        SELECT COALESCE(MAX(secuencial_atractivo), 0) + 1
          INTO NEW.secuencial_atractivo
          FROM centros_turisticos
         WHERE parroquia_id = NEW.parroquia_id;
        IF NEW.secuencial_atractivo > 999 THEN
            RAISE EXCEPTION 'La parroquia % alcanzó el máximo de 999 atractivos', NEW.parroquia_id;
        END IF;
    END IF;

    IF NEW.jerarquia_id IS NULL THEN
        NEW.codigo_atractivo := NULL;
        RETURN NEW;
    END IF;

    SELECT p.codigo_dpa, c.codigo_cton, q.codigo_pqa
      INTO v_codigo_provincia, v_codigo_canton, v_codigo_parroquia
      FROM parroquias q
      JOIN cantones c ON c.id = q.canton_id
      JOIN provincias p ON p.id = c.provincia_id
     WHERE q.id = NEW.parroquia_id;

    SELECT ca.codigo, ta.codigo, sa.codigo
      INTO v_codigo_categoria, v_codigo_tipo, v_codigo_subtipo
      FROM subtipos_atractivo sa
      JOIN tipos_atractivo ta ON ta.id = sa.tipo_atractivo_id
      JOIN categorias_atractivo ca ON ca.id = ta.categoria_id
     WHERE sa.id = NEW.subtipo_atractivo_id;

    SELECT codigo INTO v_codigo_jerarquia
      FROM rangos_jerarquia WHERE id = NEW.jerarquia_id;

    NEW.codigo_atractivo :=
        v_codigo_provincia || v_codigo_canton || v_codigo_parroquia ||
        v_codigo_categoria || v_codigo_tipo || v_codigo_subtipo ||
        v_codigo_jerarquia || LPAD(NEW.secuencial_atractivo::TEXT, 3, '0');
    RETURN NEW;
END;
$$;

-- Una aprobación anterior no publicó aún el snapshot. Crear una solicitud nueva
-- permite completar la acción atómica sin modificar aquella decisión histórica.
INSERT INTO revisiones_publicacion (
    centro_turistico_id, solicitado_por, estado_resenia_id, datos_propuestos
)
SELECT b.centro_turistico_id, COALESCE(last_review.solicitado_por, b.actualizado_por),
       pending.id, b.datos
FROM borradores_centros_turisticos b
JOIN estados_resenia previous ON previous.id = b.estado_resenia_id
CROSS JOIN estados_resenia pending
LEFT JOIN LATERAL (
    SELECT r.solicitado_por
    FROM revisiones_publicacion r
    WHERE r.centro_turistico_id = b.centro_turistico_id
    ORDER BY r.fecha_solicitud DESC, r.id DESC
    LIMIT 1
) last_review ON TRUE
WHERE previous.codigo = 'APROBADO' AND pending.codigo = 'EN_REVISION';

UPDATE centros_turisticos c
SET estado_resenia_id = target.id,
    activo = CASE WHEN previous.codigo = 'INACTIVO' THEN FALSE ELSE c.activo END
FROM estados_resenia previous, estados_resenia target
WHERE previous.id = c.estado_resenia_id
  AND previous.codigo IN ('APROBADO', 'RECHAZADO', 'INACTIVO')
  AND target.codigo = CASE previous.codigo
      WHEN 'APROBADO' THEN CASE WHEN EXISTS (
          SELECT 1 FROM borradores_centros_turisticos b
          JOIN estados_resenia bstate ON bstate.id = b.estado_resenia_id
          WHERE b.centro_turistico_id = c.id
            AND bstate.codigo IN ('APROBADO', 'EN_REVISION')
      ) THEN 'EN_REVISION' ELSE 'BORRADOR' END
      WHEN 'RECHAZADO' THEN 'BORRADOR'
      WHEN 'INACTIVO' THEN CASE WHEN c.publicado_at IS NOT NULL THEN 'PUBLICADO' ELSE 'BORRADOR' END
  END;

UPDATE borradores_centros_turisticos b
SET estado_resenia_id = target.id
FROM estados_resenia previous, estados_resenia target
WHERE previous.id = b.estado_resenia_id
  AND previous.codigo IN ('APROBADO', 'RECHAZADO', 'INACTIVO')
  AND target.codigo = CASE previous.codigo
      WHEN 'APROBADO' THEN 'EN_REVISION'
      ELSE 'BORRADOR'
  END;

-- Las filas antiguas permanecen para resolver FKs históricas y decisiones previas.
UPDATE estados_resenia
SET activo = (codigo IN ('BORRADOR', 'EN_REVISION', 'PUBLICADO'))
WHERE codigo IN ('BORRADOR', 'EN_REVISION', 'APROBADO', 'PUBLICADO', 'RECHAZADO', 'INACTIVO')
  AND activo IS DISTINCT FROM (codigo IN ('BORRADOR', 'EN_REVISION', 'PUBLICADO'));

COMMIT;
