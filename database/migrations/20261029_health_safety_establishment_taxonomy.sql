-- Servicios de apoyo al visitante en el catastro: salud y seguridad/emergencias.
-- Son actividades propias (no vienen del catastro de MINTUR) para que farmacias,
-- hospitales, UPC y similares no se mezclen con alojamiento, comida o agencias.
-- Es aditiva e idempotente: no toca filas existentes ni IDs. Salud usa el ícono
-- `health-hospital`; seguridad usa `tourism-information` hasta contar con un ícono propio.

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

INSERT INTO catalogo_catastro_actividades (codigo, nombre)
VALUES
  ('ACT_0500afdf71b84e', 'SERVICIOS DE SALUD'),
  ('ACT_8578a4d2f14bec', 'SEGURIDAD Y EMERGENCIAS')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO catalogo_catastro_clasificaciones (actividad_id, codigo, nombre, icono, color)
SELECT a.id, n.codigo, n.nombre, n.icono, n.color
  FROM (VALUES
  ('SERVICIOS DE SALUD', 'CLS_c11fa291d18f92', 'FARMACIA', 'health-hospital', '#9f1239'),
  ('SERVICIOS DE SALUD', 'CLS_76e50d6b8a5647', 'HOSPITAL', 'health-hospital', '#9f1239'),
  ('SERVICIOS DE SALUD', 'CLS_bcd1ae7979ad63', 'CENTRO DE SALUD', 'health-hospital', '#9f1239'),
  ('SERVICIOS DE SALUD', 'CLS_9c954b20883afb', 'CLÍNICA', 'health-hospital', '#9f1239'),
  ('SEGURIDAD Y EMERGENCIAS', 'CLS_b0bdcc7769161a', 'UPC', 'tourism-information', '#0369a1'),
  ('SEGURIDAD Y EMERGENCIAS', 'CLS_7fa419624297b9', 'ESTACIÓN DE POLICÍA', 'tourism-information', '#0369a1'),
  ('SEGURIDAD Y EMERGENCIAS', 'CLS_8e179673c86a0b', 'BOMBEROS', 'tourism-information', '#0369a1'),
  ('SEGURIDAD Y EMERGENCIAS', 'CLS_89c7e16fcf768a', 'ECU 911', 'tourism-information', '#0369a1')
  ) AS n(actividad, codigo, nombre, icono, color)
  JOIN catalogo_catastro_actividades a ON a.nombre = n.actividad
ON CONFLICT (actividad_id, nombre) DO NOTHING;

INSERT INTO catalogo_catastro_categorias
  (clasificacion_id, codigo, nombre, orden, icono, color, esquema, requiere_revision)
SELECT c.id, n.codigo, 'Categoría única', 1, c.icono, c.color, 'OTRA', FALSE
  FROM (VALUES
  ('SERVICIOS DE SALUD', 'FARMACIA', 'CAT_4f8c0d589f9d63'),
  ('SERVICIOS DE SALUD', 'HOSPITAL', 'CAT_5d935c167cfd0d'),
  ('SERVICIOS DE SALUD', 'CENTRO DE SALUD', 'CAT_8c18c1ff38f38d'),
  ('SERVICIOS DE SALUD', 'CLÍNICA', 'CAT_082f5fe25ab11d'),
  ('SEGURIDAD Y EMERGENCIAS', 'UPC', 'CAT_b2874094b876fb'),
  ('SEGURIDAD Y EMERGENCIAS', 'ESTACIÓN DE POLICÍA', 'CAT_77076c17fd35d0'),
  ('SEGURIDAD Y EMERGENCIAS', 'BOMBEROS', 'CAT_f39d3346fee0ca'),
  ('SEGURIDAD Y EMERGENCIAS', 'ECU 911', 'CAT_d5ca108dc60465')
  ) AS n(actividad, clasificacion, codigo)
  JOIN catalogo_catastro_actividades a ON a.nombre = n.actividad
  JOIN catalogo_catastro_clasificaciones c
    ON c.actividad_id = a.id AND c.nombre = n.clasificacion
ON CONFLICT (clasificacion_id, nombre) DO NOTHING;

COMMIT;
