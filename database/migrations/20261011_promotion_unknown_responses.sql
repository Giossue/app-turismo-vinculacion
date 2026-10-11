-- Las casillas sin respuesta de Promoción no son una respuesta negativa.
-- Aplicar antes de la API que conserva SIN_INFORMACION como NULL, con destino,
-- respaldo, propietario y permisos verificados. No reescribe datos históricos.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE promocion_centro_turistico
    ALTER COLUMN tiene_plan_promocion DROP NOT NULL,
    ALTER COLUMN forma_parte_paquete DROP NOT NULL;

COMMIT;
