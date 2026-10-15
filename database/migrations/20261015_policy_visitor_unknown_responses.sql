-- Las preguntas sin marcar de Políticas y del registro de visitantes no son una
-- respuesta negativa. Igual que en Promoción, SIN_INFORMACION se conserva como NULL.
-- Aplicar antes de la API que escribe NULL. No reescribe datos históricos.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE respuestas_politica_centro
    ALTER COLUMN respuesta DROP NOT NULL;

ALTER TABLE registros_visitantes
    ALTER COLUMN existe_registro DROP NOT NULL,
    ALTER COLUMN genera_reportes DROP NOT NULL,
    ALTER COLUMN genera_reportes DROP DEFAULT;

COMMIT;
