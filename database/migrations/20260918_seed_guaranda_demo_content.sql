-- Contenido demostrativo de Guaranda para validar la experiencia pública.
--
-- Precondiciones:
--   * baseline turismo_vinculacion_app.sql
--   * 20260918_admin_center_media.sql
--
-- Los textos y coordenadas pertenecen a fichas locales de demostración. Las imágenes
-- asociadas son material generado para prototipo y deben sustituirse por fotografía
-- institucional antes de una publicación productiva.

BEGIN;

UPDATE centros_turisticos AS c
SET nombre = seed.nombre,
    descripcion = seed.descripcion,
    barrio_sector_comuna = seed.barrio,
    calle_principal = seed.calle,
    numero_direccion = seed.numero,
    calle_transversal = seed.transversal,
    updated_at = CURRENT_TIMESTAMP
FROM (
  VALUES
    (
      '020201AN010103001'::text,
      'Mirador turístico de Guaranda'::varchar,
      'Punto panorámico para apreciar el paisaje andino y la ciudad de Guaranda. Ideal para fotografía, caminata corta y observación del entorno. Información referencial de demostración; validar horarios y condiciones antes de publicar.'::varchar,
      'Entorno de Guaranda'::varchar,
      'Vía al mirador'::varchar,
      'S/N'::varchar,
      'Acceso principal'::varchar
    ),
    (
      '020201AN010102002'::text,
      'Mirador El Calvario'::varchar,
      'Mirador de ladera con una vista amplia de Guaranda y sus montañas. El recorrido combina un acceso peatonal corto, paisaje rural y espacios para contemplación. Información referencial de demostración; confirmar condiciones en sitio.'::varchar,
      'Sector El Calvario'::varchar,
      'Camino al Calvario'::varchar,
      'S/N'::varchar,
      'Acceso peatonal'::varchar
    ),
    (
      '020201AN010102003'::text,
      'Sendero panorámico de Guaranda'::varchar,
      'Sendero de montaña para disfrutar del paisaje, la vegetación altoandina y vistas abiertas hacia el valle. Recomendado para caminata, fotografía y observación de flora y fauna. Información referencial de demostración.'::varchar,
      'Entorno rural de Guaranda'::varchar,
      'Sendero panorámico'::varchar,
      'S/N'::varchar,
      'Acceso desde Guaranda'::varchar
    ),
    (
      '020201MC020103005'::text,
      'Plaza cultural de Guaranda'::varchar,
      'Espacio público para conocer la arquitectura tradicional, reunirse y participar en actividades culturales. Su entorno permite combinar fotografía, recorridos guiados y degustación de preparaciones locales. Información referencial de demostración.'::varchar,
      'Centro de Guaranda'::varchar,
      'Calle García Moreno'::varchar,
      'S/N'::varchar,
      'Calle Sucre'::varchar
    ),
    (
      '020201MC010103004'::text,
      'Centro histórico de Guaranda'::varchar,
      'Conjunto de calles y edificaciones tradicionales que conserva la identidad urbana de Guaranda. Una visita a pie permite observar fachadas, balcones y espacios de encuentro. Información referencial de demostración; validar horarios de cada servicio.'::varchar,
      'Centro de Guaranda'::varchar,
      'Calle Convención'::varchar,
      'S/N'::varchar,
      'Calle Sucre'::varchar
    )
) AS seed(codigo, nombre, descripcion, barrio, calle, numero, transversal)
WHERE TRIM(c.codigo_atractivo) = seed.codigo;

-- Ingreso y horario referencial para que la ficha no quede vacía en el prototipo.
INSERT INTO ingresos_centro_turistico (
  centro_turistico_id, tipo_ingreso_id, modalidad_atencion_id,
  hora_ingreso, hora_salida, maneja_reservas, precio_desde, precio_hasta,
  observacion
)
SELECT c.id, 1, 1, '06:00'::time, '18:00'::time, FALSE, 0, 0,
       'Horario y acceso referenciales de demostración; validar con la administración local.'
FROM centros_turisticos c
WHERE TRIM(c.codigo_atractivo) IN (
  '020201AN010103001', '020201AN010102002', '020201AN010102003'
)
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

INSERT INTO ingresos_centro_turistico (
  centro_turistico_id, tipo_ingreso_id, modalidad_atencion_id,
  hora_ingreso, hora_salida, maneja_reservas, precio_desde, precio_hasta,
  observacion
)
SELECT c.id, 1, 1, '08:00'::time, '20:00'::time, FALSE, 0, 0,
       'Horario y acceso referenciales de demostración; validar con la administración local.'
FROM centros_turisticos c
WHERE TRIM(c.codigo_atractivo) IN (
  '020201MC020103005', '020201MC010103004'
)
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

-- Actividades compatibles con la categoría de cada centro.
INSERT INTO actividades_centro_turistico (
  centro_turistico_id, actividad_turistica_id, activo, observacion
)
SELECT c.id, activity.activity_id, TRUE,
       'Actividad referencial de demostración; validar disponibilidad en sitio.'
FROM centros_turisticos c
JOIN (
  VALUES
    ('020201AN010103001'::text, 1::bigint),
    ('020201AN010103001'::text, 4::bigint),
    ('020201AN010102002'::text, 1::bigint),
    ('020201AN010102002'::text, 4::bigint),
    ('020201AN010102003'::text, 1::bigint),
    ('020201AN010102003'::text, 4::bigint),
    ('020201AN010102003'::text, 7::bigint),
    ('020201MC020103005'::text, 18::bigint),
    ('020201MC020103005'::text, 19::bigint),
    ('020201MC020103005'::text, 20::bigint),
    ('020201MC020103005'::text, 21::bigint),
    ('020201MC020103005'::text, 22::bigint),
    ('020201MC020103005'::text, 24::bigint),
    ('020201MC010103004'::text, 18::bigint),
    ('020201MC010103004'::text, 20::bigint),
    ('020201MC010103004'::text, 21::bigint),
    ('020201MC010103004'::text, 22::bigint),
    ('020201MC010103004'::text, 24::bigint)
) AS activity(codigo, activity_id)
  ON activity.codigo = TRIM(c.codigo_atractivo)
WHERE NOT EXISTS (
  SELECT 1
  FROM actividades_centro_turistico existing
  WHERE existing.centro_turistico_id = c.id
    AND existing.actividad_turistica_id = activity.activity_id
);

-- Una condición general queda registrada para cada ficha; no se inventan
-- condiciones específicas de accesibilidad que requieran verificación en sitio.
INSERT INTO centro_accesibilidad_resumen (
  centro_turistico_id, tipo_accesibilidad_id, aplica, observacion
)
SELECT c.id, 1, TRUE,
       'Registro general de demostración; confirmar condiciones de accesibilidad antes de publicar información definitiva.'
FROM centros_turisticos c
WHERE TRIM(c.codigo_atractivo) IN (
  '020201AN010103001', '020201AN010102002', '020201AN010102003',
  '020201MC020103005', '020201MC010103004'
)
ON CONFLICT (centro_turistico_id, tipo_accesibilidad_id) DO UPDATE SET
  aplica = EXCLUDED.aplica,
  observacion = EXCLUDED.observacion;

-- Facilidades mínimas referenciales para que las fichas muestren contenido útil.
INSERT INTO facilidades_centro (
  centro_turistico_id, tipo_facilidad_id, cantidad, observacion
)
SELECT c.id, facility.type_id, facility.quantity,
       'Facilidad referencial de demostración; validar disponibilidad en sitio.'
FROM centros_turisticos c
JOIN (
  VALUES
    ('020201AN010103001'::text, 8::bigint, 1::smallint),
    ('020201AN010103001'::text, 12::bigint, 1::smallint),
    ('020201AN010103001'::text, 14::bigint, 1::smallint),
    ('020201AN010102002'::text, 8::bigint, 1::smallint),
    ('020201AN010102002'::text, 14::bigint, 1::smallint),
    ('020201AN010102003'::text, 13::bigint, 1::smallint),
    ('020201AN010102003'::text, 12::bigint, 1::smallint),
    ('020201MC020103005'::text, 1::bigint, 1::smallint),
    ('020201MC020103005'::text, 14::bigint, 1::smallint),
    ('020201MC020103005'::text, 15::bigint, 1::smallint),
    ('020201MC010103004'::text, 5::bigint, 1::smallint),
    ('020201MC010103004'::text, 15::bigint, 1::smallint)
) AS facility(codigo, type_id, quantity)
  ON facility.codigo = TRIM(c.codigo_atractivo)
WHERE NOT EXISTS (
  SELECT 1
  FROM facilidades_centro existing
  WHERE existing.centro_turistico_id = c.id
    AND existing.tipo_facilidad_id = facility.type_id
);

-- Metadatos de las fotografías generadas para el prototipo. Los objetos deben existir
-- en apps/api/.data/media/centers/<id>/photos antes de servir la API local.
INSERT INTO archivos_centro_turistico (
  centro_turistico_id, tipo_archivo_centro_id, nombre_original, ruta_archivo,
  proveedor_almacenamiento, checksum_sha256, mime_type, tamano_bytes,
  fuente_autor, descripcion, orden, estado, subido_por
)
SELECT c.id, t.id, seed.file_name,
       'centers/' || c.id || '/photos/' || seed.file_name,
       'LOCAL', seed.checksum, 'image/jpeg', seed.size_bytes,
       'Imagen generada por IA para prototipo; sustituir por fotografía institucional.',
       'Imagen de referencia generada para la ficha turística.', 1, 'PUBLICADO', NULL
FROM centros_turisticos c
JOIN tipos_archivo_centro_turistico t ON t.codigo = 'FOTOGRAFIA'
JOIN (
  VALUES
    ('020201AN010103001'::text, 'mirador-guaranda.jpg'::text, 'f915ae25c45b9e4e060f22fa3a44439e10d88bb1018df8a874035f5dde15bd2d'::text, 317307::bigint),
    ('020201AN010102002'::text, 'mirador-calvario.jpg'::text, '3cca0041cdb222a9a65f40982f45b772e241da094351a052ff670c3899c22e1c'::text, 243959::bigint),
    ('020201AN010102003'::text, 'sendero-panoramico.jpg'::text, 'fdb4f53f79f78f420916ce5a9acbb76e2fb903717e3f8d736216b65b70a50c75'::text, 341051::bigint),
    ('020201MC020103005'::text, 'plaza-cultural.jpg'::text, '6e906f57aa289f05da3cb73aa6343f5e58a7eb275792fcf8c3fd7a5bd204bdca'::text, 316518::bigint),
    ('020201MC010103004'::text, 'centro-historico.jpg'::text, '6905083e586c61cea85eddbab407b9a6fd052506f5102d7df7170fa34d8925c3'::text, 316678::bigint)
) AS seed(codigo, file_name, checksum, size_bytes)
  ON seed.codigo = TRIM(c.codigo_atractivo)
WHERE NOT EXISTS (
  SELECT 1
  FROM archivos_centro_turistico existing
  WHERE existing.ruta_archivo = 'centers/' || c.id || '/photos/' || seed.file_name
);

COMMIT;
