-- Eliminar una ficha turística la borra de verdad, con sus archivos, revisiones e
-- historial de auditoría. La protección de inmutabilidad del historial se mantiene
-- para cualquier otro cambio: solo se permite el borrado en cascada desde la ficha.
-- Las conversaciones de IA se conservan sin la ficha. No reescribe datos existentes.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

CREATE OR REPLACE FUNCTION fn_impedir_cambio_auditoria_fichas()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Dentro de un trigger anidado (la acción de la clave foránea) la fila se borra
    -- porque se borra su ficha; un DELETE o UPDATE directo sigue prohibido.
    IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN
        RETURN OLD;
    END IF;
    RAISE EXCEPTION 'Los registros de auditoría son inmutables';
END;
$$;

DROP TRIGGER IF EXISTS trg_auditoria_inmutable ON auditoria_fichas;
CREATE TRIGGER trg_auditoria_inmutable
BEFORE UPDATE OR DELETE ON auditoria_fichas
FOR EACH ROW EXECUTE FUNCTION fn_impedir_cambio_auditoria_fichas();

DO $$
DECLARE
    dependiente RECORD;
BEGIN
    FOR dependiente IN
        SELECT c.conrelid::regclass AS tabla,
               c.conname AS restriccion,
               a.attname AS columna,
               CASE c.conrelid::regclass::text
                   WHEN 'conversaciones_ia' THEN 'SET NULL'
                   ELSE 'CASCADE'
               END AS accion
          FROM pg_constraint c
          JOIN pg_attribute a
            ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
         WHERE c.contype = 'f'
           AND c.confrelid = 'centros_turisticos'::regclass
           AND c.confdeltype = 'r'
    LOOP
        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', dependiente.tabla, dependiente.restriccion);
        EXECUTE format(
            'ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES centros_turisticos (id) ON DELETE %s',
            dependiente.tabla, dependiente.restriccion, dependiente.columna, dependiente.accion
        );
    END LOOP;
END;
$$;

COMMIT;
