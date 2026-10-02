BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '5min';

-- Expressions match SearchService exactly. No new function or extension is
-- needed by the API: it works before these optional performance indexes exist.
CREATE INDEX IF NOT EXISTS idx_centros_nombre_normalizado_trgm
ON centros_turisticos USING GIN
  (btrim(regexp_replace(
    lower(regexp_replace(normalize(nombre, NFD), U&'[\0300-\036f]', '', 'g') COLLATE "C"),
    '[^a-z0-9]+', ' ', 'g'
  )) gin_trgm_ops)
WHERE activo;

CREATE INDEX IF NOT EXISTS idx_establecimientos_nombre_normalizado_trgm
ON establecimientos_turisticos USING GIN
  (btrim(regexp_replace(
    lower(regexp_replace(normalize(nombre_comercial, NFD), U&'[\0300-\036f]', '', 'g') COLLATE "C"),
    '[^a-z0-9]+', ' ', 'g'
  )) gin_trgm_ops)
WHERE activo;

COMMIT;
