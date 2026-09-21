-- Hace obligatorias las coordenadas de establecimientos turísticos.
--
-- Precondiciones operativas:
--   * respaldar establecimientos_turisticos antes de ejecutar;
--   * verificar que cada localidad usada tenga latitud y longitud.
--
-- Las filas existentes sin coordenadas individuales reciben la coordenada de su localidad
-- y quedan marcadas como aproximadas. La migración se detiene si encuentra una coordenada
-- aislada o una localidad sin coordenadas, para no inventar ubicaciones.

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';

ALTER TABLE establecimientos_turisticos
  ADD COLUMN IF NOT EXISTS coordenadas_aproximadas BOOLEAN NOT NULL DEFAULT FALSE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM establecimientos_turisticos
    WHERE (latitud IS NULL) <> (longitud IS NULL)
  ) THEN
    RAISE EXCEPTION
      'No se puede completar coordenadas: hay establecimientos con una sola coordenada';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM establecimientos_turisticos e
    JOIN localidades l ON l.id = e.localidad_id
    WHERE e.latitud IS NULL
      AND e.longitud IS NULL
      AND (l.latitud IS NULL OR l.longitud IS NULL)
  ) THEN
    RAISE EXCEPTION
      'No se puede completar coordenadas: hay localidades sin latitud o longitud';
  END IF;
END;
$$;

UPDATE establecimientos_turisticos e
   SET latitud = l.latitud,
       longitud = l.longitud,
       coordenadas_aproximadas = TRUE,
       updated_at = CURRENT_TIMESTAMP
  FROM localidades l
 WHERE l.id = e.localidad_id
   AND e.latitud IS NULL
   AND e.longitud IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM establecimientos_turisticos
    WHERE latitud IS NULL OR longitud IS NULL
  ) THEN
    RAISE EXCEPTION
      'No se puede establecer NOT NULL: todavía hay coordenadas faltantes';
  END IF;
END;
$$;

ALTER TABLE establecimientos_turisticos
  ALTER COLUMN latitud SET NOT NULL,
  ALTER COLUMN longitud SET NOT NULL,
  ALTER COLUMN coordenadas_aproximadas SET DEFAULT FALSE,
  ALTER COLUMN coordenadas_aproximadas SET NOT NULL;

COMMENT ON COLUMN establecimientos_turisticos.coordenadas_aproximadas IS
  'Indica que las coordenadas corresponden a la localidad y no a la ubicación exacta del establecimiento.';

COMMIT;
