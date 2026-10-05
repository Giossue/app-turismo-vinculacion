-- Garantiza el catálogo completo de tipos de archivo de la ficha. Las bases creadas solo
-- con migraciones no tenían FOTOGRAFIA/MAPA/PLAN_CONTINGENCIA/OTRO (vivían únicamente en
-- el esquema base) y la carga de multimedia respondía "El tipo de archivo no está
-- configurado".
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

INSERT INTO tipos_archivo_centro_turistico (codigo, nombre) VALUES
    ('FOTOGRAFIA', 'Fotografía'),
    ('VIDEO', 'Video'),
    ('AUDIO', 'Audio'),
    ('MAPA', 'Mapa'),
    ('PLAN_CONTINGENCIA', 'Plan de contingencia'),
    ('OTRO', 'Otro anexo')
ON CONFLICT (codigo) DO UPDATE SET activo = TRUE;

COMMIT;
