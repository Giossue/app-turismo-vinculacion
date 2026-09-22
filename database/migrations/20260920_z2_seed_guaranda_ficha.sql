-- Seed de desarrollo: ficha integral que la experiencia presenta como la zona turística.
--
-- En el esquema relacional actual `zonas_turisticas` es el contenedor territorial y
-- `centros_turisticos` es la raíz de la ficha. La ficha visible se crea dentro de la
-- zona `Entorno de Guaranda`, sin crear tablas ni columnas nuevas.
--
-- Los datos son referenciales para demo. Deben validarse institucionalmente antes de
-- una publicación productiva.

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

WITH referencias AS (
  SELECT
    z.id AS zona_id,
    q.id AS parroquia_id,
    sa.id AS subtipo_id,
    lp.id AS linea_id,
    es.id AS escenario_id,
    j.id AS jerarquia_id,
    er.id AS estado_id
  FROM zonas_turisticas z
  JOIN localidades l ON l.id = z.localidad_id
  JOIN cantones c ON c.id = l.canton_id
  JOIN provincias p ON p.id = c.provincia_id
  JOIN parroquias q ON q.canton_id = c.id AND q.codigo_pqa = '01'
  JOIN subtipos_atractivo sa ON sa.codigo = '02'
  JOIN tipos_atractivo ta ON ta.id = sa.tipo_atractivo_id AND ta.codigo = '01'
  JOIN categorias_atractivo ca ON ca.id = ta.categoria_id AND ca.codigo = 'MC'
  JOIN lineas_producto lp ON lp.codigo = 'CULTURA' AND lp.activo
  JOIN escenarios es ON es.codigo = 'URBANO' AND es.activo
  JOIN rangos_jerarquia j ON j.codigo = '02' AND j.activo
  JOIN estados_resenia er ON er.codigo = 'PUBLICADO' AND er.activo
  WHERE z.nombre = 'Entorno de Guaranda'
    AND l.nombre = 'Guaranda'
    AND l.activo
    AND c.codigo_cton = '01'
    AND p.codigo_dpa = '02'
    AND z.activo
    AND sa.activo
    AND ta.activo
    AND ca.activo
), ficha AS (
  INSERT INTO centros_turisticos (
    secuencial_atractivo,
    nombre,
    subtipo_atractivo_id,
    zona_turistica_id,
    parroquia_id,
    linea_producto_id,
    escenario_id,
    jerarquia_id,
    estado_resenia_id,
    puntaje_total,
    barrio_sector_comuna,
    calle_principal,
    numero_direccion,
    calle_transversal,
    latitud,
    longitud,
    ubicacion,
    altitud_msnm,
    descripcion,
    activo,
    publicado_at
  )
  SELECT
    1,
    'Centro Cultural Indio Guaranga',
    subtipo_id,
    zona_id,
    parroquia_id,
    linea_id,
    escenario_id,
    jerarquia_id,
    estado_id,
    48.70,
    'Centro de Guaranda',
    'Calle Convención',
    'S/N',
    'Calle Sucre',
    -1.592630,
    -79.000980,
    ST_SetSRID(ST_MakePoint(-79.000980, -1.592630), 4326)::geography,
    2668,
    'Espacio cultural de referencia para conocer expresiones, memoria y actividades de la identidad guarandeña. Esta ficha contiene información demostrativa basada en el libro institucional y debe validarse con la administración local antes de su publicación productiva.',
    TRUE,
    CURRENT_TIMESTAMP
  FROM referencias
  ON CONFLICT (parroquia_id, secuencial_atractivo) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    subtipo_atractivo_id = EXCLUDED.subtipo_atractivo_id,
    zona_turistica_id = EXCLUDED.zona_turistica_id,
    linea_producto_id = EXCLUDED.linea_producto_id,
    escenario_id = EXCLUDED.escenario_id,
    jerarquia_id = EXCLUDED.jerarquia_id,
    estado_resenia_id = EXCLUDED.estado_resenia_id,
    puntaje_total = EXCLUDED.puntaje_total,
    barrio_sector_comuna = EXCLUDED.barrio_sector_comuna,
    calle_principal = EXCLUDED.calle_principal,
    numero_direccion = EXCLUDED.numero_direccion,
    calle_transversal = EXCLUDED.calle_transversal,
    latitud = EXCLUDED.latitud,
    longitud = EXCLUDED.longitud,
    ubicacion = EXCLUDED.ubicacion,
    altitud_msnm = EXCLUDED.altitud_msnm,
    descripcion = EXCLUDED.descripcion,
    activo = TRUE,
    publicado_at = EXCLUDED.publicado_at,
    updated_at = CURRENT_TIMESTAMP
  RETURNING id
)
SELECT count(*) FROM ficha;

WITH ficha AS (
  SELECT id FROM centros_turisticos
  WHERE TRIM(codigo_atractivo) = '020101MC010202001'
)
INSERT INTO administraciones_atractivo (
  centro_turistico_id, tipo_administrador, institucion, nombre_administrador,
  cargo, observacion
)
SELECT
  id,
  'GAD_MUNICIPAL',
  'Gobierno Autónomo Descentralizado Municipal de Guaranda',
  'Administración municipal de Guaranda',
  'Gestión cultural y turística',
  'Dato referencial de demostración; confirmar responsable, cargo y contacto institucional.'
FROM ficha
ON CONFLICT (centro_turistico_id) DO UPDATE SET
  tipo_administrador = EXCLUDED.tipo_administrador,
  institucion = EXCLUDED.institucion,
  nombre_administrador = EXCLUDED.nombre_administrador,
  cargo = EXCLUDED.cargo,
  observacion = EXCLUDED.observacion,
  updated_at = CURRENT_TIMESTAMP;

WITH ficha AS (
  SELECT id FROM centros_turisticos
  WHERE TRIM(codigo_atractivo) = '020101MC010202001'
), ingreso AS (
  SELECT id FROM tipos_ingreso WHERE codigo = 'LIBRE' AND activo LIMIT 1
), atencion AS (
  SELECT id FROM modalidades_atencion WHERE codigo = 'TODOS_DIAS' AND activo LIMIT 1
)
INSERT INTO ingresos_centro_turistico (
  centro_turistico_id, tipo_ingreso_id, modalidad_atencion_id, hora_ingreso,
  hora_salida, maneja_reservas, precio_desde, precio_hasta, observacion
)
SELECT
  ficha.id,
  ingreso.id,
  atencion.id,
  '08:00'::time,
  '18:00'::time,
  FALSE,
  0,
  0,
  'Horario y acceso referenciales de demostración; confirmar horarios oficiales antes de publicar.'
FROM ficha, ingreso, atencion
ON CONFLICT (centro_turistico_id) DO UPDATE SET
  tipo_ingreso_id = EXCLUDED.tipo_ingreso_id,
  modalidad_atencion_id = EXCLUDED.modalidad_atencion_id,
  hora_ingreso = EXCLUDED.hora_ingreso,
  hora_salida = EXCLUDED.hora_salida,
  maneja_reservas = EXCLUDED.maneja_reservas,
  precio_desde = EXCLUDED.precio_desde,
  precio_hasta = EXCLUDED.precio_hasta,
  observacion = EXCLUDED.observacion,
  updated_at = CURRENT_TIMESTAMP;

WITH ficha AS (
  SELECT id FROM centros_turisticos
  WHERE TRIM(codigo_atractivo) = '020101MC010202001'
), pago AS (
  SELECT id FROM formas_pago WHERE codigo = 'EFECTIVO' AND activo LIMIT 1
)
INSERT INTO centro_formas_pago (centro_turistico_id, forma_pago_id)
SELECT ficha.id, pago.id FROM ficha, pago
ON CONFLICT (centro_turistico_id, forma_pago_id) DO NOTHING;

WITH ficha AS (
  SELECT id FROM centros_turisticos
  WHERE TRIM(codigo_atractivo) = '020101MC010202001'
)
INSERT INTO centro_meses_recomendados (centro_turistico_id, mes_id, motivo)
SELECT ficha.id, meses.id, 'Temporada referencial para actividades culturales; validar agenda anual.'
FROM ficha
JOIN meses ON meses.numero IN (2, 3, 4, 8, 11)
ON CONFLICT (centro_turistico_id, mes_id) DO UPDATE SET
  motivo = EXCLUDED.motivo;

WITH ficha AS (
  SELECT id FROM centros_turisticos
  WHERE TRIM(codigo_atractivo) = '020101MC010202001'
), localidad AS (
  SELECT l.id
  FROM localidades l
  JOIN cantones c ON c.id = l.canton_id
  JOIN provincias p ON p.id = c.provincia_id
  WHERE l.nombre = 'Guaranda' AND c.codigo_cton = '01' AND p.codigo_dpa = '02'
)
INSERT INTO centro_localidad_cercana (
  centro_turistico_id, localidad_id, distancia_km, tiempo_desplazamiento, observacion
)
SELECT ficha.id, localidad.id, 0, '00:00:00'::interval,
       'La ficha se ubica dentro de la ciudad de Guaranda; el registro es referencial.'
FROM ficha, localidad
ON CONFLICT (centro_turistico_id) DO UPDATE SET
  localidad_id = EXCLUDED.localidad_id,
  distancia_km = EXCLUDED.distancia_km,
  tiempo_desplazamiento = EXCLUDED.tiempo_desplazamiento,
  observacion = EXCLUDED.observacion,
  updated_at = CURRENT_TIMESTAMP;

WITH ficha AS (
  SELECT id FROM centros_turisticos
  WHERE TRIM(codigo_atractivo) = '020101MC010202001'
), accesibilidad AS (
  SELECT id FROM tipos_accesibilidad WHERE codigo = 'GENERAL' AND activo LIMIT 1
)
INSERT INTO centro_accesibilidad_resumen (
  centro_turistico_id, tipo_accesibilidad_id, aplica, observacion
)
SELECT ficha.id, accesibilidad.id, TRUE,
       'Accesibilidad general registrada como referencia; validar rampas, circulación y servicios en el levantamiento institucional.'
FROM ficha, accesibilidad
ON CONFLICT (centro_turistico_id, tipo_accesibilidad_id) DO UPDATE SET
  aplica = EXCLUDED.aplica,
  observacion = EXCLUDED.observacion;

WITH ficha AS (
  SELECT id FROM centros_turisticos
  WHERE TRIM(codigo_atractivo) = '020101MC010202001'
), condicion AS (
  SELECT id FROM estados_condicion WHERE codigo = 'BUENO' AND activo LIMIT 1
)
INSERT INTO senalizaciones_aproximacion (
  centro_turistico_id, disponible, estado_condicion_id, observacion
)
SELECT ficha.id, TRUE, condicion.id,
       'Señalización referencial para la ficha; confirmar elementos existentes en sitio.'
FROM ficha, condicion
ON CONFLICT (centro_turistico_id) DO UPDATE SET
  disponible = EXCLUDED.disponible,
  estado_condicion_id = EXCLUDED.estado_condicion_id,
  observacion = EXCLUDED.observacion,
  updated_at = CURRENT_TIMESTAMP;

WITH ficha AS (
  SELECT id FROM centros_turisticos
  WHERE TRIM(codigo_atractivo) = '020101MC010202001'
), ambito AS (
  SELECT id FROM ambitos_ubicacion_servicio WHERE codigo = 'EN_ATRACTIVO' AND activo LIMIT 1
), tipo AS (
  SELECT id, codigo FROM tipos_planta_turistica
  WHERE activo AND codigo IN ('ALIMENTOS_CAFETERIAS', 'GUIA_LOCAL')
)
INSERT INTO planta_turistica_centro (
  centro_turistico_id, ambito_ubicacion_servicio_id, tipo_planta_turistica_id,
  cantidad_1, cantidad_2, cantidad_3, observacion
)
SELECT ficha.id, ambito.id, tipo.id,
       CASE WHEN tipo.codigo = 'ALIMENTOS_CAFETERIAS' THEN 1 ELSE 0 END,
       NULL,
       NULL,
       'Agregado referencial de planta turística; contrastar con el catastro vigente.'
FROM ficha, ambito, tipo
ON CONFLICT (centro_turistico_id, ambito_ubicacion_servicio_id, tipo_planta_turistica_id) DO UPDATE SET
  cantidad_1 = EXCLUDED.cantidad_1,
  cantidad_2 = EXCLUDED.cantidad_2,
  cantidad_3 = EXCLUDED.cantidad_3,
  observacion = EXCLUDED.observacion;

WITH ficha AS (
  SELECT id FROM centros_turisticos
  WHERE TRIM(codigo_atractivo) = '020101MC010202001'
), condicion AS (
  SELECT id FROM estados_condicion WHERE codigo = 'BUENO' AND activo LIMIT 1
), facilidades AS (
  SELECT id, codigo FROM tipos_facilidad
  WHERE activo AND codigo IN ('CENTRO_RECEPCION', 'PUNTO_INFORMACION', 'BATERIA_SANITARIA', 'ESTACIONAMIENTO')
)
INSERT INTO facilidades_centro (
  centro_turistico_id, tipo_facilidad_id, cantidad, latitud, longitud,
  accesibilidad_universal, estado_condicion_id, observacion
)
SELECT ficha.id, facilidades.id, 1, -1.592630, -79.000980,
       CASE WHEN facilidades.codigo IN ('PUNTO_INFORMACION', 'BATERIA_SANITARIA') THEN TRUE ELSE NULL END,
       condicion.id,
       'Facilidad referencial de demostración; validar disponibilidad y accesibilidad en sitio.'
FROM ficha, condicion, facilidades
WHERE NOT EXISTS (
  SELECT 1 FROM facilidades_centro fc
  WHERE fc.centro_turistico_id = ficha.id
    AND fc.tipo_facilidad_id = facilidades.id
);

WITH ficha AS (
  SELECT id FROM centros_turisticos
  WHERE TRIM(codigo_atractivo) = '020101MC010202001'
), actividades AS (
  SELECT id, codigo FROM actividades_turisticas
  WHERE activo AND codigo IN (
    'CULTURA_07',
    'CULTURA_08',
    'CULTURA_MUESTRAS_AUDIOVISUALES',
    'CULTURA_PRESENTACIONES_O_REPRESENTACIONES_EN_VIVO',
    'CULTURA_RECORRIDO_AUTOGUIADOS',
    'ARTESANIAS',
    'DEGUSTACION'
  )
)
INSERT INTO actividades_centro_turistico (
  centro_turistico_id, actividad_turistica_id, activo, observacion
)
SELECT ficha.id, actividades.id, TRUE,
       'Actividad cultural referencial; confirmar programación y disponibilidad.'
FROM ficha, actividades
ON CONFLICT (centro_turistico_id, actividad_turistica_id) DO UPDATE SET
  activo = TRUE,
  observacion = EXCLUDED.observacion;

WITH ficha AS (
  SELECT id FROM centros_turisticos
  WHERE TRIM(codigo_atractivo) = '020101MC010202001'
)
INSERT INTO promocion_centro_turistico (
  centro_turistico_id, tiene_plan_promocion, nombre_plan, incluido_en_plan,
  forma_parte_paquete, detalle_paquete, observacion
)
SELECT id, TRUE, 'Agenda cultural y turística de Guaranda (referencial)', TRUE,
       FALSE, NULL,
       'Plan demostrativo; validar con la entidad responsable antes de publicar.'
FROM ficha
ON CONFLICT (centro_turistico_id) DO UPDATE SET
  tiene_plan_promocion = EXCLUDED.tiene_plan_promocion,
  nombre_plan = EXCLUDED.nombre_plan,
  incluido_en_plan = EXCLUDED.incluido_en_plan,
  forma_parte_paquete = EXCLUDED.forma_parte_paquete,
  detalle_paquete = EXCLUDED.detalle_paquete,
  observacion = EXCLUDED.observacion,
  updated_at = CURRENT_TIMESTAMP;

WITH ficha AS (
  SELECT id FROM centros_turisticos
  WHERE TRIM(codigo_atractivo) = '020101MC010202001'
), medios AS (
  SELECT id, codigo FROM tipos_medio_promocion
  WHERE activo AND codigo IN ('PAGINA_WEB', 'RED_SOCIAL', 'OFICINA_INFORMACION_TURISTICA')
)
INSERT INTO medios_promocion_centro_turistico (
  centro_turistico_id, tipo_medio_promocion_id, nombre, observacion
)
SELECT ficha.id, medios.id,
       CASE medios.codigo
         WHEN 'PAGINA_WEB' THEN 'Portal turístico municipal'
         WHEN 'RED_SOCIAL' THEN 'Canales sociales institucionales'
         ELSE 'Oficina de información turística'
       END,
       'Medio referencial; completar URL y datos institucionales durante la validación.'
FROM ficha, medios
WHERE NOT EXISTS (
  SELECT 1 FROM medios_promocion_centro_turistico existing
  WHERE existing.centro_turistico_id = ficha.id
    AND existing.tipo_medio_promocion_id = medios.id
);

WITH ficha AS (
  SELECT id FROM centros_turisticos
  WHERE TRIM(codigo_atractivo) = '020101MC010202001'
), criterios (codigo, puntaje) AS (
  VALUES
    ('A'::char(1), 0.00::numeric),
    ('B'::char(1), 7.20::numeric),
    ('C'::char(1), 10.00::numeric),
    ('D'::char(1), 7.50::numeric),
    ('E'::char(1), 2.00::numeric),
    ('F'::char(1), 9.00::numeric),
    ('G'::char(1), 5.00::numeric),
    ('H'::char(1), 5.00::numeric),
    ('I'::char(1), 3.00::numeric)
)
INSERT INTO resultados_criterio (
  centro_turistico_id, criterio_valoracion_id, puntaje_obtenido,
  puntaje_maximo_aplicado
)
SELECT ficha.id, cv.id, criterios.puntaje, cv.puntaje_maximo
FROM ficha
JOIN criterios ON TRUE
JOIN criterios_valoracion cv ON cv.codigo = criterios.codigo AND cv.activo
ON CONFLICT (centro_turistico_id, criterio_valoracion_id) DO UPDATE SET
  puntaje_obtenido = EXCLUDED.puntaje_obtenido,
  puntaje_maximo_aplicado = EXCLUDED.puntaje_maximo_aplicado,
  calculado_at = CURRENT_TIMESTAMP;

WITH ficha AS (
  SELECT id FROM centros_turisticos
  WHERE TRIM(codigo_atractivo) = '020101MC010202001'
), tipo AS (
  SELECT id FROM tipos_archivo_centro_turistico WHERE codigo = 'FOTOGRAFIA' AND activo LIMIT 1
), fotos (nombre, ruta, checksum, tamano, descripcion, orden, latitud, longitud) AS (
  VALUES
    (
      '01-panorama-urbano-guaranda.png'::text,
      '01-panorama-urbano-guaranda.png'::text,
      'b545b6ad9b78a6123b439633970ca2f204d9f3e21c0c865ac878dd9ee8093492'::text,
      3036189::bigint,
      'Vista urbana andina generada para la ficha; imagen ilustrativa, no representa necesariamente un punto exacto.'::text,
      1::smallint,
      -1.592630::numeric,
      -79.000980::numeric
    ),
    (
      '02-plaza-guaranda.png'::text,
      '02-plaza-guaranda.png'::text,
      '58608046fde13ed004b5c7567ede307a06cb02de428265f7f6955eaac253aa36'::text,
      3118691::bigint,
      'Espacio público cultural generado para la ficha; imagen ilustrativa, no representa necesariamente un punto exacto.'::text,
      2::smallint,
      -1.593400::numeric,
      -79.000800::numeric
    ),
    (
      '03-sendero-panoramico-guaranda.png'::text,
      '03-sendero-panoramico-guaranda.png'::text,
      '28eee599ecd3dc75032035c8ab0f3aa414f0b3a11ca546b956138e587f79002f'::text,
      3346370::bigint,
      'Entorno paisajístico generado para la ficha; imagen ilustrativa, no representa necesariamente un punto exacto.'::text,
      3::smallint,
      -1.600800::numeric,
      -79.007100::numeric
    )
)
INSERT INTO archivos_centro_turistico (
  centro_turistico_id, tipo_archivo_centro_id, nombre_original, ruta_archivo,
  proveedor_almacenamiento, checksum_sha256, mime_type, tamano_bytes,
  fuente_autor, descripcion, latitud, longitud, orden, estado
)
SELECT
  ficha.id,
  tipo.id,
  fotos.nombre,
  'centers/' || ficha.id || '/photos/' || fotos.ruta,
  'LOCAL',
  fotos.checksum,
  'image/png',
  fotos.tamano,
  'GPT Image; material generado para demo',
  fotos.descripcion,
  fotos.latitud,
  fotos.longitud,
  fotos.orden,
  'PUBLICADO'
FROM ficha, tipo, fotos
WHERE NOT EXISTS (
  SELECT 1
  FROM archivos_centro_turistico existing
  WHERE existing.centro_turistico_id = ficha.id
    AND existing.ruta_archivo = 'centers/' || ficha.id || '/photos/' || fotos.ruta
);

DO $$
DECLARE
  ficha_id BIGINT;
  total_fotos INTEGER;
  total_criterios INTEGER;
  total_puntaje NUMERIC;
BEGIN
  SELECT c.id
  INTO ficha_id
  FROM centros_turisticos c
  WHERE TRIM(c.codigo_atractivo) = '020101MC010202001'
    AND c.nombre = 'Centro Cultural Indio Guaranga'
    AND c.activo
    AND c.estado_resenia_id = (SELECT id FROM estados_resenia WHERE codigo = 'PUBLICADO');

  IF ficha_id IS NULL THEN
    RAISE EXCEPTION 'No se pudo crear o publicar la ficha Centro Cultural Indio Guaranga';
  END IF;

  SELECT count(*)::INTEGER INTO total_fotos
  FROM archivos_centro_turistico a
  JOIN tipos_archivo_centro_turistico t ON t.id = a.tipo_archivo_centro_id
  WHERE a.centro_turistico_id = ficha_id
    AND a.estado = 'PUBLICADO'
    AND t.codigo = 'FOTOGRAFIA';

  SELECT count(*)::INTEGER, COALESCE(sum(puntaje_obtenido), 0)
  INTO total_criterios, total_puntaje
  FROM resultados_criterio
  WHERE centro_turistico_id = ficha_id;

  IF total_fotos <> 3 THEN
    RAISE EXCEPTION 'Se esperaban tres fotografías publicadas; se encontraron %', total_fotos;
  END IF;
  IF total_criterios <> 9 OR total_puntaje <> 48.70 THEN
    RAISE EXCEPTION 'La valoración A-I no está completa: criterios %, puntaje %', total_criterios, total_puntaje;
  END IF;
END $$;

COMMIT;
