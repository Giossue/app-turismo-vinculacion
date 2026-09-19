-- Catálogos mínimos para capturar actividades, accesibilidad y facilidades desde el panel.
-- Idempotente: no reemplaza catálogos administrados posteriormente.
INSERT INTO tipos_accesibilidad (codigo, nombre)
VALUES
  ('GENERAL', 'Accesibilidad general'),
  ('FISICA', 'Discapacidad física'),
  ('VISUAL', 'Discapacidad visual'),
  ('AUDITIVA', 'Discapacidad auditiva'),
  ('COGNITIVA', 'Discapacidad intelectual o psicosocial'),
  ('NO_ACCESIBLE', 'No accesible')
ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO categorias_facilidad (codigo, nombre)
VALUES
  ('GESTION', 'Apoyo a la gestión'),
  ('OBSERVACION', 'Observación y vigilancia'),
  ('RECORRIDO', 'Recorrido, descanso y recreación'),
  ('SERVICIO', 'Servicios'),
  ('OTROS', 'Otros')
ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO tipos_facilidad (categoria_facilidad_id, codigo, nombre)
SELECT cf.id, source.codigo, source.nombre
  FROM (VALUES
    ('GESTION', 'PUNTO_INFORMACION', 'Punto de información'),
    ('GESTION', 'I_TUR', 'I-Tur'),
    ('GESTION', 'CENTRO_INTERPRETACION', 'Centro de interpretación'),
    ('GESTION', 'CENTRO_FACILITACION', 'Centro de facilitación'),
    ('GESTION', 'CENTRO_RECEPCION', 'Centro de recepción de visitantes'),
    ('OBSERVACION', 'GARITA', 'Garita'),
    ('OBSERVACION', 'MIRADOR', 'Mirador'),
    ('OBSERVACION', 'TORRE_AVISTAMIENTO', 'Torre de avistamiento de aves'),
    ('OBSERVACION', 'TORRE_SALVAVIDAS', 'Torre de salvavidas'),
    ('RECORRIDO', 'SENDERO', 'Sendero'),
    ('RECORRIDO', 'SOMBRA_DESCANSO', 'Estación de sombra y descanso'),
    ('RECORRIDO', 'AREA_ACAMPAR', 'Área de acampar'),
    ('RECORRIDO', 'REFUGIO_MONTAÑA', 'Refugio de montaña'),
    ('SERVICIO', 'BATERIA_SANITARIA', 'Batería sanitaria'),
    ('SERVICIO', 'ESTACIONAMIENTO', 'Estacionamiento'),
    ('OTROS', 'OTRO', 'Otro')
  ) AS source(category_code, codigo, nombre)
  JOIN categorias_facilidad cf ON cf.codigo = source.category_code
ON CONFLICT (codigo) DO UPDATE SET
  categoria_facilidad_id = EXCLUDED.categoria_facilidad_id,
  nombre = EXCLUDED.nombre;

INSERT INTO grupos_actividad (categoria_atractivo_id, codigo, nombre)
SELECT ca.id, source.codigo, source.nombre
  FROM (VALUES
    ('AN', 'AGUA', 'Agua'),
    ('AN', 'AIRE', 'Aire'),
    ('AN', 'TIERRA', 'Tierra'),
    ('MC', 'CULTURA', 'Actividades culturales')
  ) AS source(category_code, codigo, nombre)
  JOIN categorias_atractivo ca ON ca.codigo = source.category_code
ON CONFLICT (codigo) DO UPDATE SET
  categoria_atractivo_id = EXCLUDED.categoria_atractivo_id,
  nombre = EXCLUDED.nombre;

INSERT INTO actividades_turisticas (grupo_actividad_id, codigo, nombre)
SELECT ga.id, source.codigo, source.nombre
  FROM (VALUES
    ('AGUA', 'BUCEO', 'Buceo'), ('AGUA', 'KAYAK', 'Kayak'),
    ('AGUA', 'RAFTING', 'Rafting'), ('AGUA', 'PESCA_DEPORTIVA', 'Pesca deportiva'),
    ('AIRE', 'CANOPY', 'Canopy'), ('AIRE', 'PARAPENTE', 'Parapente'),
    ('AIRE', 'ALA_DELTA', 'Ala delta'), ('TIERRA', 'MONTANISMO', 'Montañismo'),
    ('TIERRA', 'ESCALADA', 'Escalada'), ('TIERRA', 'SENDERISMO', 'Senderismo'),
    ('TIERRA', 'CICLOTURISMO', 'Cicloturismo'), ('TIERRA', 'CABALGATA', 'Cabalgata'),
    ('TIERRA', 'CAMINATA', 'Caminata'), ('TIERRA', 'CAMPING', 'Camping'),
    ('TIERRA', 'PICNIC', 'Picnic'), ('TIERRA', 'OBSERVACION_FLORA_FAUNA', 'Observación de flora y fauna'),
    ('CULTURA', 'RECORRIDO_GUIADO', 'Recorrido guiado'), ('CULTURA', 'TALLER_ARTESANAL', 'Taller artístico o artesanal'),
    ('CULTURA', 'EXPOSICION', 'Exposición'), ('CULTURA', 'FOTOGRAFIA', 'Fotografía'),
    ('CULTURA', 'DEGUSTACION', 'Degustación de platos tradicionales'), ('CULTURA', 'CELEBRACIONES', 'Participación en celebraciones'),
    ('CULTURA', 'ARTESANIAS', 'Compra de artesanías'), ('CULTURA', 'MEDICINA_ANCESTRAL', 'Medicina ancestral')
  ) AS source(group_code, codigo, nombre)
  JOIN grupos_actividad ga ON ga.codigo = source.group_code
ON CONFLICT (codigo) DO UPDATE SET
  grupo_actividad_id = EXCLUDED.grupo_actividad_id,
  nombre = EXCLUDED.nombre;
