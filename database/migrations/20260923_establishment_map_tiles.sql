-- Índice espacial para las teselas vectoriales del mapa público
-- (GET /establishments/tiles/:z/:x/:y). ST_TileEnvelope trabaja en Web
-- Mercator (EPSG:3857), así que se indexa la misma expresión que usa la
-- consulta; `ubicacion` sigue siendo la fuente de verdad (geography 4326).

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';

CREATE INDEX IF NOT EXISTS idx_establecimientos_ubicacion_mercator
  ON establecimientos_turisticos
  USING gist (ST_Transform(ubicacion::geometry, 3857));

COMMIT;
