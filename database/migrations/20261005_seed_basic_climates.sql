-- Climas básicos que usan las fichas MINTUR (el campo "a. Clima" es texto libre en la
-- plantilla). Permite que la importación del Excel resuelva "Templado" y similares.
-- Idempotente: no modifica nombres ni estado de climas ya existentes.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

INSERT INTO catalogo_clima (codigo, nombre) VALUES
    ('CALIDO', 'Cálido'),
    ('TEMPLADO', 'Templado'),
    ('FRIO', 'Frío')
ON CONFLICT DO NOTHING;

COMMIT;
