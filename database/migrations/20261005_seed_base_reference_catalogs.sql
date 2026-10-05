-- Catálogos de referencia que solo sembraba el esquema base
-- (`turismo_vinculacion_app.sql`). Las bases creadas sin esos inserts no podían
-- publicar fichas: p. ej. "El ámbito de ubicación seleccionado no está disponible
-- para publicar" al validar la planta turística. Idempotente: mismos inserts que
-- el esquema base, sin modificar filas existentes.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

INSERT INTO ambitos_ubicacion_servicio (codigo, nombre) VALUES
    ('EN_ATRACTIVO', 'En el atractivo'),
    ('EN_POBLADO_CERCANO', 'En el poblado cercano')
ON CONFLICT DO NOTHING;

INSERT INTO coberturas_acceso_aereo (codigo, nombre) VALUES
    ('NACIONAL', 'Nacional'), ('INTERNACIONAL', 'Internacional')
ON CONFLICT DO NOTHING;

INSERT INTO componentes_conservacion (codigo, nombre) VALUES
    ('ATRACTIVO', 'Atractivo'), ('ENTORNO', 'Entorno')
ON CONFLICT DO NOTHING;

INSERT INTO estados_condicion (codigo, nombre) VALUES
    ('BUENO', 'Bueno'), ('REGULAR', 'Regular'), ('MALO', 'Malo')
ON CONFLICT DO NOTHING;

INSERT INTO formas_pago (codigo, nombre) VALUES
    ('EFECTIVO', 'Efectivo'),
    ('DINERO_ELECTRONICO', 'Dinero electrónico'),
    ('DEPOSITO_BANCARIO', 'Depósito bancario'),
    ('TARJETA_DEBITO', 'Tarjeta de débito'),
    ('TARJETA_CREDITO', 'Tarjeta de crédito'),
    ('TRANSFERENCIA', 'Transferencia bancaria'),
    ('CHEQUE', 'Cheque')
ON CONFLICT DO NOTHING;

INSERT INTO meses (numero, nombre) VALUES
    (1, 'Enero'), (2, 'Febrero'), (3, 'Marzo'), (4, 'Abril'),
    (5, 'Mayo'), (6, 'Junio'), (7, 'Julio'), (8, 'Agosto'),
    (9, 'Septiembre'), (10, 'Octubre'), (11, 'Noviembre'), (12, 'Diciembre')
ON CONFLICT DO NOTHING;

INSERT INTO modalidades_acceso_acuatico (codigo, nombre) VALUES
    ('MARITIMO', 'Marítimo'), ('LACUSTRE', 'Lacustre'), ('FLUVIAL', 'Fluvial')
ON CONFLICT DO NOTHING;

INSERT INTO tipos_responsabilidad_ficha (codigo, nombre) VALUES
    ('ELABORO', 'Elaboró'), ('VALIDO', 'Validó'), ('APROBO', 'Aprobó')
ON CONFLICT DO NOTHING;

INSERT INTO tipos_via_terrestre (codigo, nombre) VALUES
    ('PRIMER_ORDEN', 'Primer orden'),
    ('SEGUNDO_ORDEN', 'Segundo orden'),
    ('TERCER_ORDEN', 'Tercer orden')
ON CONFLICT DO NOTHING;

COMMIT;
