-- Catálogo de indicadores de valoración trasladado desde las hojas
-- `Jerarquia` y `Calculos` del XLSM ecuatoriano.
--
-- Este archivo no modifica el esquema. Es un seed manual e idempotente: debe
-- ejecutarse después del snapshot inicial, cuando los nueve criterios A-I ya
-- existan. La API no ejecuta semillas automáticamente ni evalúa este texto
-- como código; `regla_calculo` solo conserva trazabilidad humana.

WITH definiciones(criterio, codigo, nombre, puntaje_maximo, regla_calculo, orden) AS (
  VALUES
    ('A', 'A.TRANSPORT', 'Transporte de acceso normalizado', 9.00, 'Calculos!I18: promedio de modalidades aplicables, cada una normalizada a 9', 1),
    ('A', 'A.ACCESS_PHYSICAL_01', 'Accesibilidad general', 2.00, 'Jerarquia!B8: respuesta afirmativa, peso 2', 2),
    ('A', 'A.ACCESS_PHYSICAL_02', 'Accesibilidad física', 1.00, 'Jerarquia!B9: respuesta afirmativa, peso 1', 3),
    ('A', 'A.ACCESS_PHYSICAL_03', 'Accesibilidad visual', 1.00, 'Jerarquia!B10: respuesta afirmativa, peso 1', 4),
    ('A', 'A.ACCESS_PHYSICAL_04', 'Accesibilidad auditiva', 1.00, 'Jerarquia!B11: respuesta afirmativa, peso 1', 5),
    ('A', 'A.ACCESS_PHYSICAL_05', 'Accesibilidad cognitiva o psicosocial', 1.00, 'Jerarquia!B12: respuesta afirmativa, peso 1', 6),
    ('A', 'A.CONNECTIVITY_01', 'Conectividad: transporte disponible', 3.00, 'Jerarquia!B13: respuesta afirmativa, peso 3', 7),
    ('A', 'A.CONNECTIVITY_02', 'Conectividad: detalle de servicio', 2.00, 'Jerarquia!B14: respuesta afirmativa, peso 2', 8),
    ('A', 'A.CONNECTIVITY_03', 'Conectividad: señalización de aproximación', 1.00, 'Jerarquia!B15: respuesta afirmativa, peso 1', 9),

    ('B', 'B.PLANT_01', 'Alojamiento: hotel', 1.50, 'Jerarquia!B19: existe planta registrada, peso 1.5', 1),
    ('B', 'B.PLANT_02', 'Alojamiento: hostal', 1.50, 'Jerarquia!B20: existe planta registrada, peso 1.5', 2),
    ('B', 'B.PLANT_03', 'Alojamiento: hostería', 1.50, 'Jerarquia!B21: existe planta registrada, peso 1.5', 3),
    ('B', 'B.PLANT_04', 'Alojamiento: hacienda turística', 1.50, 'Jerarquia!B22: existe planta registrada, peso 1.5', 4),
    ('B', 'B.PLANT_05', 'Alojamiento: lodge', 1.50, 'Jerarquia!B23: existe planta registrada, peso 1.5', 5),
    ('B', 'B.PLANT_06', 'Alojamiento: resort', 1.50, 'Jerarquia!B24: existe planta registrada, peso 1.5', 6),
    ('B', 'B.PLANT_07', 'Alojamiento: refugio', 1.50, 'Jerarquia!B25: existe planta registrada, peso 1.5', 7),
    ('B', 'B.PLANT_08', 'Alojamiento: campamento turístico', 1.50, 'Jerarquia!B26: existe planta registrada, peso 1.5', 8),
    ('B', 'B.PLANT_09', 'Alojamiento: casa de huéspedes', 0.60, 'Jerarquia!B27: existe planta registrada, peso 0.6', 9),
    ('B', 'B.PLANT_10', 'Alimentos y bebidas: restaurante', 0.60, 'Jerarquia!B28: existe planta registrada, peso 0.6', 10),
    ('B', 'B.PLANT_11', 'Alimentos y bebidas: cafetería', 0.60, 'Jerarquia!B29: existe planta registrada, peso 0.6', 11),
    ('B', 'B.PLANT_12', 'Alimentos y bebidas: bar', 0.60, 'Jerarquia!B30: existe planta registrada, peso 0.6', 12),
    ('B', 'B.PLANT_13', 'Alimentos y bebidas: fuente de soda', 0.60, 'Jerarquia!B31: existe planta registrada, peso 0.6', 13),
    ('B', 'B.PLANT_14', 'Operación turística: agencia', 1.50, 'Jerarquia!B32: existe agencia u operación registrada, peso 1.5', 14),
    ('B', 'B.PLANT_15', 'Guianza turística', 1.50, 'Jerarquia!B33: existe guía registrado, peso 1.5', 15),

    ('C', 'C.ATTR_CONSERVATION', 'Estado de conservación del atractivo', 7.00, 'Jerarquia!B37:B40: conservado 7, alterado 5, en deterioro 3, deteriorado 1', 1),
    ('C', 'C.ENV_CONSERVATION', 'Estado de conservación del entorno', 7.00, 'Jerarquia!B41:B44: conservado 7, alterado 5, en deterioro 3, deteriorado 1', 2),

    ('D', 'D.HYGIENE_SAFETY_01', 'Servicio básico: agua', 1.50, 'Jerarquia!B48: respuesta afirmativa, peso 1.5', 1),
    ('D', 'D.HYGIENE_SAFETY_02', 'Servicio básico: energía', 1.50, 'Jerarquia!B49: respuesta afirmativa, peso 1.5', 2),
    ('D', 'D.HYGIENE_SAFETY_03', 'Servicio básico: saneamiento', 0.60, 'Jerarquia!B50: respuesta afirmativa, peso 0.6', 3),
    ('D', 'D.HYGIENE_SAFETY_04', 'Servicio básico: disposición de desechos', 0.60, 'Jerarquia!B51: respuesta afirmativa, peso 0.6', 4),
    ('D', 'D.HYGIENE_SAFETY_05', 'Señalética turística', 0.60, 'Jerarquia!B52: respuesta afirmativa, peso 0.6', 5),
    ('D', 'D.HYGIENE_SAFETY_06', 'Servicios de salud', 0.60, 'Jerarquia!B53: respuesta afirmativa, peso 0.6', 6),
    ('D', 'D.HYGIENE_SAFETY_07', 'Servicios de seguridad', 0.60, 'Jerarquia!B54: respuesta afirmativa, peso 0.6', 7),
    ('D', 'D.HYGIENE_SAFETY_08', 'Comunicación de uso público', 1.50, 'Jerarquia!B55: respuesta afirmativa, peso 1.5', 8),
    ('D', 'D.HYGIENE_SAFETY_09', 'Radio portátil disponible', 1.50, 'Jerarquia!B56: respuesta afirmativa, peso 1.5', 9),
    ('D', 'D.HYGIENE_SAFETY_10', 'Plan de contingencia', 2.00, 'Jerarquia!B57: respuesta afirmativa, peso 2', 10),
    ('D', 'D.HYGIENE_SAFETY_11', 'Radio para visitantes', 1.00, 'Jerarquia!B58: respuesta afirmativa, peso 1', 11),
    ('D', 'D.HYGIENE_SAFETY_12', 'Radio para comunicación interna', 1.00, 'Jerarquia!B59: respuesta afirmativa, peso 1', 12),
    ('D', 'D.HYGIENE_SAFETY_13', 'Radio para emergencias', 1.00, 'Jerarquia!B60: respuesta afirmativa, peso 1', 13),

    ('E', 'E.POLICIES_01', 'Plan de desarrollo turístico del GAD', 3.00, 'Jerarquia!B64: respuesta afirmativa, peso 3', 1),
    ('E', 'E.POLICIES_02', 'Planificación territorial turística', 3.00, 'Jerarquia!B65: respuesta afirmativa, peso 3', 2),
    ('E', 'E.POLICIES_03', 'Regulaciones aplicables', 2.00, 'Jerarquia!B66: respuesta afirmativa, peso 2', 3),
    ('E', 'E.POLICIES_04', 'Ordenanzas aplicables', 2.00, 'Jerarquia!B67: respuesta afirmativa, peso 2', 4),

    ('F', 'F.ACTIVITIES_01', 'Actividades de agua', 3.00, 'Jerarquia!B72: actividad natural de agua, peso 3', 1),
    ('F', 'F.ACTIVITIES_02', 'Actividades de aire', 3.00, 'Jerarquia!B73: actividad natural de aire, peso 3', 2),
    ('F', 'F.ACTIVITIES_03', 'Actividades de superficie terrestre', 3.00, 'Jerarquia!B74: actividad natural terrestre, peso 3', 3),
    ('F', 'F.ACTIVITIES_04', 'Actividades culturales', 9.00, 'Jerarquia!B75: actividad cultural, peso 9', 4),

    ('G', 'G.PROMOTION_01', 'Plan de promoción turística', 2.00, 'Jerarquia!B79: respuesta afirmativa, peso 2', 1),
    ('G', 'G.PROMOTION_02', 'Inclusión en el plan de promoción', 2.00, 'Jerarquia!B80: respuesta afirmativa, peso 2', 2),
    ('G', 'G.PROMOTION_03', 'Parte de un paquete turístico', 3.00, 'Jerarquia!B81: respuesta afirmativa, peso 3', 3),

    ('H', 'H.VISITORS_01', 'Sistema de registro de visitantes', 3.00, 'Jerarquia!B85: respuesta afirmativa, peso 3', 1),
    ('H', 'H.VISITORS_02', 'Reporte estadístico de visitas', 2.00, 'Jerarquia!B86: respuesta afirmativa, peso 2', 2),
    ('H', 'H.VISITORS_03', 'Datos de temporadas y procedencias', 2.00, 'Jerarquia!B87: respuesta afirmativa, peso 2', 3),

    ('I', 'I.HUMAN_RESOURCES_01', 'Personal de administración y operación', 2.00, 'Jerarquia!B91: cantidad mayor que cero, peso 2', 1),
    ('I', 'I.HUMAN_RESOURCES_02', 'Personal especializado en turismo', 2.00, 'Jerarquia!B92: cantidad mayor que cero, peso 2', 2),
    ('I', 'I.HUMAN_RESOURCES_03', 'Personal formado o con idiomas', 1.00, 'Jerarquia!B93: cantidad mayor que cero, peso 1', 3)
)
INSERT INTO indicadores_valoracion
  (criterio_valoracion_id, codigo, nombre, puntaje_maximo, regla_calculo, orden, activo)
SELECT cv.id, d.codigo, d.nombre, d.puntaje_maximo, d.regla_calculo, d.orden, TRUE
  FROM definiciones d
  JOIN criterios_valoracion cv ON TRIM(cv.codigo) = d.criterio
ON CONFLICT (codigo) DO UPDATE SET
  criterio_valoracion_id = EXCLUDED.criterio_valoracion_id,
  nombre = EXCLUDED.nombre,
  puntaje_maximo = EXCLUDED.puntaje_maximo,
  regla_calculo = EXCLUDED.regla_calculo,
  orden = EXCLUDED.orden,
  activo = EXCLUDED.activo;
