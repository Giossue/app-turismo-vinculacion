-- La zona turística no es un campo de la ficha MINTUR (el .xlsm solo la usa como
-- lista auxiliar) y el catálogo rara vez cubre todos los cantones. Pasa a opcional:
-- un centro sin zona se publica normalmente y solo queda fuera de los paquetes offline,
-- que se arman por zona.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE centros_turisticos ALTER COLUMN zona_turistica_id DROP NOT NULL;

COMMIT;
