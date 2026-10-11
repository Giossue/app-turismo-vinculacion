-- Conserva factores y observaciones aunque el Excel no confirme un estado.
-- Aplicar antes de la API compatible, con destino, respaldo, propietario y
-- permisos verificados. No transforma evaluaciones ni factores históricos.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE evaluaciones_conservacion
    ALTER COLUMN estado_conservacion_id DROP NOT NULL;

COMMIT;
