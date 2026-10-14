-- Interruptores de la plataforma que fija el administrador. Por ahora dos:
-- publicar sin revisión los catastros y las fichas que envían los agentes.
-- Aditiva e idempotente; ambos nacen apagados (la revisión sigue vigente).
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE IF NOT EXISTS configuracion_plataforma (
    clave VARCHAR(80) PRIMARY KEY,
    valor_booleano BOOLEAN NOT NULL DEFAULT FALSE,
    actualizado_por BIGINT REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO configuracion_plataforma (clave, valor_booleano)
VALUES ('publicacion_directa_catastros', FALSE),
       ('publicacion_directa_fichas', FALSE)
ON CONFLICT (clave) DO NOTHING;

COMMIT;
