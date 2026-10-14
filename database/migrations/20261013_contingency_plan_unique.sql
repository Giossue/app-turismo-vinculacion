-- Un centro tiene a lo sumo un plan de contingencia. El guardado de la sección
-- «Higiene y seguridad» hace upsert por centro_turistico_id y requiere este índice.
-- Aditiva e idempotente; falla si ya existieran duplicados.
CREATE UNIQUE INDEX IF NOT EXISTS planes_contingencia_centro_turistico_id_key
  ON planes_contingencia (centro_turistico_id);
