-- Catálogos operativos fijos derivados del XLSM institucional de la ficha turística.
-- Fuente: temp/Centro Cultural Indio Guaranga (2).xlsm
-- SHA-256: 137a3c2db2c9b0d94d5590ae7d87e3ea2dea9a59cb9cda7fbb86e116ca0ed8cf
-- No carga datos de ejemplo, clima libre, materiales de vía, localidades ni zonas turísticas.
-- No elimina opciones técnicas administradas posteriormente; solo actualiza/reactiva códigos fuente.

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';

INSERT INTO tipos_accesibilidad (codigo, nombre)
VALUES
  ('GENERAL', 'Accesibilidad general'),
  ('FISICA', 'Discapacidad física'),
  ('VISUAL', 'Discapacidad visual'),
  ('AUDITIVA', 'Discapacidad auditiva'),
  ('COGNITIVA', 'Discapacidad intelectual o psicosocial')
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  activo = TRUE;

INSERT INTO tipos_transporte (codigo, nombre)
VALUES
  ('BUS', 'Bus'),
  ('BUSETA', 'Buseta'),
  ('TRANSPORTE_4X4', 'Transporte 4x4'),
  ('TAXI', 'Taxi'),
  ('MOTOTAXI', 'Moto taxi'),
  ('TELEFERICO', 'Teleférico'),
  ('LANCHA', 'Lancha'),
  ('BOTE', 'Bote'),
  ('BARCO', 'Barco'),
  ('CANOA', 'Canoa'),
  ('AVION', 'Avión'),
  ('AVIONETA', 'Avioneta'),
  ('HELICOPTERO', 'Helicóptero'),
  ('OTRO', 'Otro')
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  activo = TRUE;

INSERT INTO frecuencias_servicio (codigo, nombre)
VALUES
  ('DIARIO', 'Diaria'),
  ('SEMANAL', 'Semanal'),
  ('MENSUAL', 'Mensual'),
  ('EVENTUAL', 'Eventual')
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  activo = TRUE;

INSERT INTO criterios_accesibilidad (tipo_accesibilidad_id, codigo, descripcion, orden)
SELECT parent.id, source.codigo, source.descripcion, source.orden
FROM (VALUES
  ('GENERAL', 'GENERAL_01', 'Estacionamiento', 1),
  ('GENERAL', 'GENERAL_02', 'Estacionamiento vehicular para personas con discapacidad', 2),
  ('GENERAL', 'GENERAL_03', 'Rampas externas a desnivel', 3),
  ('GENERAL', 'GENERAL_04', 'Gradas externas (Ingresos)', 4),
  ('GENERAL', 'GENERAL_05', 'Vías de circulación peatonal', 5),
  ('GENERAL', 'GENERAL_06', 'Señalética Informativa', 6),
  ('GENERAL', 'GENERAL_07', 'Señalética Direccional', 7),
  ('GENERAL', 'GENERAL_08', 'Señalética Preventiva', 8),
  ('GENERAL', 'GENERAL_09', 'Puertas automáticas', 9),
  ('GENERAL', 'GENERAL_10', 'Ascensor', 10),
  ('GENERAL', 'GENERAL_11', 'Recepción', 11),
  ('GENERAL', 'GENERAL_12', 'Puntos de concentración turística (Salones, auditorios, miradores, muelles, malecones, centros de interpretación, granjas, etc.)', 12),
  ('GENERAL', 'GENERAL_13', 'Cuartos de baño y aseo (Comunal o Social)', 13),
  ('GENERAL', 'GENERAL_14', 'Baño - Accesorio indicador libre/ocupado', 14),
  ('FISICA', 'FISICA_01', 'Rampas externas de existir desnivel entre acera y acceso', 1),
  ('FISICA', 'FISICA_02', 'Pasamanos', 2),
  ('FISICA', 'FISICA_03', 'Recepción adaptada para personas con discapacidad (silla de ruedas, talla baja)', 3),
  ('FISICA', 'FISICA_04', 'Cuartos de baño adaptados (Comunal o Social)', 4),
  ('FISICA', 'FISICA_05', 'Baño - Espacio de maniobra (circunferencia libre de 1,50m)', 5),
  ('FISICA', 'FISICA_06', 'Baño - Barras de apoyo', 6),
  ('FISICA', 'FISICA_07', 'Baño - Sistema de Asistencia (botón o cordón de halar)', 7),
  ('FISICA', 'FISICA_08', 'Baño - Espejo (ubicado a 50 mm desde el borde superior del lavabo)', 8),
  ('FISICA', 'FISICA_09', 'Baño - Grifería de pulsación, palanca o sensor', 9),
  ('FISICA', 'FISICA_10', 'Baño - Lavabo sin pedestal', 10),
  ('FISICA', 'FISICA_11', 'Accesorios de limpieza y aseo (Ejm. Dispensadores de gel, papel higiénico, jabón de manos, etc.) a 800 a 1100mm desde el piso.', 11),
  ('FISICA', 'FISICA_12', 'Puntos accesibles de concentración turística (que tengan rampas, pasamanos, señalética, etc. )', 12),
  ('FISICA', 'FISICA_13', 'Salvaescaleras', 13),
  ('FISICA', 'FISICA_14', 'Vías de circulación peatonal accesibles (Senderos, veredas, pasillos)', 14),
  ('VISUAL', 'VISUAL_01', 'Recepción adaptada para personas con discapacidad (Registros en braille, sistema JAWS, formatos accesibles, otras herramientas de apoyo al cliente.)', 1),
  ('VISUAL', 'VISUAL_02', 'Sensores de voz/ bucle magnético', 2),
  ('VISUAL', 'VISUAL_03', 'Rotulación para personas ciegas (Ejm: Braille, alto relieve, plano háptica)', 3),
  ('VISUAL', 'VISUAL_04', 'Pasamanos', 4),
  ('VISUAL', 'VISUAL_05', 'Cuartos de baño adaptados (Comunal o Social)', 5),
  ('VISUAL', 'VISUAL_06', 'Baño - espacio de maniobra (circunferencia libre 1,50m)', 6),
  ('VISUAL', 'VISUAL_07', 'Baño - Grifería de pulsación, palanca o sensor', 7),
  ('VISUAL', 'VISUAL_08', 'Bandas podotáctiles o contraste en piso', 8),
  ('VISUAL', 'VISUAL_09', 'Baño - Sistema de Asistencia (botón o cordón de halar)', 9),
  ('VISUAL', 'VISUAL_10', 'Puntos accesibles de concentración turística ( Información autodescriptiva, braille, "audio").', 10),
  ('VISUAL', 'VISUAL_11', 'Maquetas táctiles (3D)', 11),
  ('VISUAL', 'VISUAL_12', 'Vías de circulación peatonal accesibles (Senderos, veredas, pasillos) con bandas podotáctiles.', 12),
  ('AUDITIVA', 'AUDITIVA_01', 'Recepción adaptada para personas con discapacidad (Registros ilustrados, intérprete de lengua de señas, personal capacitado, pantallas led, subtitulado formato accesible, otras herramientas de apoyo al cliente.)', 1),
  ('AUDITIVA', 'AUDITIVA_02', 'Sensores y alarmas visuales (Luces intermitentes)', 2),
  ('AUDITIVA', 'AUDITIVA_03', 'Rotulación para personas sordas (Visual, ilustrada)', 3),
  ('AUDITIVA', 'AUDITIVA_04', 'Cuartos de baño adaptados (Comunal o Social)', 4),
  ('AUDITIVA', 'AUDITIVA_05', 'Baño - Sistema de Asistencia (botón o cordón de halar)', 5),
  ('AUDITIVA', 'AUDITIVA_06', 'Puntos accesibles de concentración turística (Información gráfica /fotografías, pósters, videos).', 6),
  ('AUDITIVA', 'AUDITIVA_07', 'Vías de circulación peatonal accesibles (Senderos, veredas, pasillos). Rotulación , Ilustraciones.', 7),
  ('COGNITIVA', 'COGNITIVA_01', 'Recepción adaptada para personas con discapacidad (Personal capacitado)', 1),
  ('COGNITIVA', 'COGNITIVA_02', 'Accesibilidad cognitiva (señalética clara, gráfica y bien distribuida)', 2),
  ('COGNITIVA', 'COGNITIVA_03', 'Baño - Sistema de Asistencia (botón o cordón de halar)', 3),
  ('COGNITIVA', 'COGNITIVA_04', 'Puntos accesibles de concentración turística (Información gráfica, fotografías, pósters, videos, guías capacitados en discapacidades)', 4)
) AS source(tipo_codigo, codigo, descripcion, orden)
JOIN tipos_accesibilidad AS parent ON parent.codigo = source.tipo_codigo
ON CONFLICT (codigo) DO UPDATE SET
  tipo_accesibilidad_id = EXCLUDED.tipo_accesibilidad_id,
  descripcion = EXCLUDED.descripcion,
  orden = EXCLUDED.orden,
  activo = TRUE;

INSERT INTO tipos_planta_turistica (grupo, codigo, nombre, unidad_1, unidad_2, unidad_3)
VALUES
  ('ALOJAMIENTO', 'ALOJAMIENTO_HOTEL', 'Hotel', 'Establecimientos registrados', 'Número de Habitaciones', 'Número de Plazas'),
  ('ALOJAMIENTO', 'ALOJAMIENTO_HOSTAL', 'Hostal', 'Establecimientos registrados', 'Número de Habitaciones', 'Número de Plazas'),
  ('ALOJAMIENTO', 'ALOJAMIENTO_HOSTERIA', 'Hostería', 'Establecimientos registrados', 'Número de Habitaciones', 'Número de Plazas'),
  ('ALOJAMIENTO', 'ALOJAMIENTO_HACIENDA_TURISTICA', 'Hacienda Turística', 'Establecimientos registrados', 'Número de Habitaciones', 'Número de Plazas'),
  ('ALOJAMIENTO', 'ALOJAMIENTO_LODGE', 'Lodge', 'Establecimientos registrados', 'Número de Habitaciones', 'Número de Plazas'),
  ('ALOJAMIENTO', 'ALOJAMIENTO_RESORT', 'Resort', 'Establecimientos registrados', 'Número de Habitaciones', 'Número de Plazas'),
  ('ALOJAMIENTO', 'ALOJAMIENTO_REFUGIO', 'Refugio', 'Establecimientos registrados', 'Número de Habitaciones', 'Número de Plazas'),
  ('ALOJAMIENTO', 'ALOJAMIENTO_CAMPAMENTO_TURISTICO', 'Campamento Turístico', 'Establecimientos registrados', 'Número de Habitaciones', 'Número de Plazas'),
  ('ALOJAMIENTO', 'ALOJAMIENTO_CASA_DE_HUESPEDES', 'Casa de Huéspedes', 'Establecimientos registrados', 'Número de Habitaciones', 'Número de Plazas'),
  ('ALIMENTOS_BEBIDAS', 'ALIMENTOS_RESTAURANTES', 'Restaurantes', 'Establecimientos registrados', 'Número de Mesas', 'Número de Plazas'),
  ('ALIMENTOS_BEBIDAS', 'ALIMENTOS_CAFETERIAS', 'Cafeterías', 'Establecimientos registrados', 'Número de Mesas', 'Número de Plazas'),
  ('ALIMENTOS_BEBIDAS', 'ALIMENTOS_BARES', 'Bares', 'Establecimientos registrados', 'Número de Mesas', 'Número de Plazas'),
  ('ALIMENTOS_BEBIDAS', 'ALIMENTOS_FUENTES_DE_SODA', 'Fuentes de soda', 'Establecimientos registrados', 'Número de Mesas', 'Número de Plazas'),
  ('AGENCIAS_VIAJE', 'AGENCIA_MAYORISTAS', 'Mayoristas', 'Establecimientos registrados', NULL, NULL),
  ('AGENCIAS_VIAJE', 'AGENCIA_INTERNACIONALES', 'Internacionales', 'Establecimientos registrados', NULL, NULL),
  ('AGENCIAS_VIAJE', 'AGENCIA_OPERADORAS', 'Operadoras', 'Establecimientos registrados', NULL, NULL),
  ('GUIAS', 'GUIA_LOCAL', 'Local', 'Personas', NULL, NULL),
  ('GUIAS', 'GUIA_NACIONAL', 'Nacional', 'Personas', NULL, NULL),
  ('GUIAS', 'GUIA_NACIONAL_ESPECIALIZADO_EN_CULTURA', 'Nacional especializado en cultura', 'Personas', NULL, NULL),
  ('GUIAS', 'GUIA_NACIONAL_ESPECIALIZADO_EN_AVENTURA', 'Nacional especializado en aventura', 'Personas', NULL, NULL)
ON CONFLICT (codigo) DO UPDATE SET
  grupo = EXCLUDED.grupo,
  nombre = EXCLUDED.nombre,
  unidad_1 = EXCLUDED.unidad_1,
  unidad_2 = EXCLUDED.unidad_2,
  unidad_3 = EXCLUDED.unidad_3,
  activo = TRUE;

INSERT INTO categorias_facilidad (codigo, nombre)
VALUES
  ('GESTION', 'De apoyo a la gestión turística'),
  ('OBSERVACION', 'De observación y vigilancia'),
  ('RECORRIDO', 'De recorrido y descanso'),
  ('SERVICIO', 'De servicio'),
  ('OTROS', 'Otros')
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  activo = TRUE;

-- Reconciliación de aliases de cargas previas; se conserva el historial.
UPDATE tipos_facilidad AS legacy
SET activo = FALSE
WHERE legacy.codigo IN (
  'GESTION_PUNTO_DE_INFORMACION',
  'GESTION_I_TUR',
  'GESTION_CENTRO_DE_INTERPRETACION',
  'GESTION_CENTRO_DE_FACILITACION_TURISTICA',
  'GESTION_05',
  'OBSERVACION_GARITAS_DE_GUARDIANIA',
  'OBSERVACION_MIRADORES',
  'OBSERVACION_08',
  'OBSERVACION_09',
  'RECORRIDO_SENDEROS',
  'RECORRIDO_11',
  'RECORRIDO_AREAS_DE_ACAMPAR',
  'RECORRIDO_REFUGIO_DE_ALTA_MONTANA',
  'SERVICIO_BATERIAS_SANITARIAS',
  'SERVICIO_ESTACIONAMIENTOS'
)
AND legacy.activo
AND EXISTS (
  SELECT 1
  FROM tipos_facilidad AS canonical
  WHERE canonical.codigo IN (
    'PUNTO_INFORMACION', 'I_TUR', 'CENTRO_INTERPRETACION',
    'CENTRO_FACILITACION', 'CENTRO_RECEPCION',
    'GARITA', 'MIRADOR', 'TORRE_AVISTAMIENTO', 'TORRE_SALVAVIDAS',
    'SENDERO', 'SOMBRA_DESCANSO', 'AREA_ACAMPAR', 'REFUGIO_MONTAÑA',
    'BATERIA_SANITARIA', 'ESTACIONAMIENTO'
  )
);

INSERT INTO tipos_facilidad (categoria_facilidad_id, codigo, nombre)
SELECT parent.id, source.codigo, source.nombre
FROM (VALUES
  ('GESTION', 'PUNTO_INFORMACION', 'Punto de Información'),
  ('GESTION', 'I_TUR', 'I-Tur'),
  ('GESTION', 'CENTRO_INTERPRETACION', 'Centro de interpretación'),
  ('GESTION', 'CENTRO_FACILITACION', 'Centro de facilitación turística'),
  ('GESTION', 'CENTRO_RECEPCION', 'Centro de recepción de visitantes'),
  ('OBSERVACION', 'GARITA', 'Garitas de guardianía'),
  ('OBSERVACION', 'MIRADOR', 'Miradores'),
  ('OBSERVACION', 'TORRE_AVISTAMIENTO', 'Torres de avistamiento de aves'),
  ('OBSERVACION', 'TORRE_SALVAVIDAS', 'Torres de vigilancia para salvavidas'),
  ('RECORRIDO', 'SENDERO', 'Senderos'),
  ('RECORRIDO', 'SOMBRA_DESCANSO', 'Estaciones de sombra y descanso'),
  ('RECORRIDO', 'AREA_ACAMPAR', 'Áreas de acampar'),
  ('RECORRIDO', 'REFUGIO_MONTAÑA', 'Refugio de alta montaña'),
  ('SERVICIO', 'BATERIA_SANITARIA', 'Baterías sanitarias'),
  ('SERVICIO', 'ESTACIONAMIENTO', 'Estacionamientos'),
  ('OTROS', 'OTRO', 'Otros')
) AS source(categoria_codigo, codigo, nombre)
JOIN categorias_facilidad AS parent ON parent.codigo = source.categoria_codigo
ON CONFLICT (codigo) DO UPDATE SET
  categoria_facilidad_id = EXCLUDED.categoria_facilidad_id,
  nombre = EXCLUDED.nombre,
  activo = TRUE;

INSERT INTO tipos_servicio_complementario (codigo, nombre)
VALUES
  ('ALQUILER_VENTA_EQUIPO', 'Alquiler y venta de equipo especializado'),
  ('VENTA_ARTESANIAS_MERCH', 'Venta de artesanías y merchandising'),
  ('CASA_CAMBIO', 'Casa de cambio'),
  ('CAJERO_AUTOMATICO', 'Cajero automático'),
  ('OTRO', 'Otro')
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  activo = TRUE;

INSERT INTO estados_conservacion (codigo, nombre)
VALUES
  ('CONSERVADO', 'Conservado'),
  ('ALTERADO', 'Alterado'),
  ('EN_PROCESO_DE_DETERIORO', 'En proceso de deterioro'),
  ('DETERIORADO', 'Deteriorado')
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  activo = TRUE;

INSERT INTO factores_alteracion (origen, codigo, nombre)
VALUES
  ('NATURAL', 'NAT_EROSION', 'Erosión'),
  ('NATURAL', 'NAT_HUMEDAD', 'Humedad'),
  ('NATURAL', 'NAT_DESASTRES_NATURALES', 'Desastres naturales'),
  ('NATURAL', 'NAT_FLORA_FAUNA', 'Flora/Fauna'),
  ('NATURAL', 'NAT_CLIMA', 'Clima'),
  ('NATURAL', 'NAT_OTRO', 'Otro'),
  ('ANTROPICO', 'ANT_ACTIVIDADES_AGRICOLAS_Y_GANADERAS', 'Actividades agrícolas y ganaderas'),
  ('ANTROPICO', 'ANT_ACTIVIDADES_FORESTALES', 'Actividades forestales'),
  ('ANTROPICO', 'ANT_ACTIVIDADES_EXTRACTIVAS_MINERIA', 'Actividades extractivas / minería'),
  ('ANTROPICO', 'ANT_ACTIVIDADES_INDUSTRIALES', 'Actividades industriales'),
  ('ANTROPICO', 'ANT_NEGLIGENCIA_ABANDONO', 'Negligencia / abandono'),
  ('ANTROPICO', 'ANT_HUAQUEARIA', 'Huaquearía'),
  ('ANTROPICO', 'ANT_CONFLICTO_DE_TENENCIA', 'Conflicto de tenencia'),
  ('ANTROPICO', 'ANT_CONDICIONES_DE_USO_Y_EXPOSICION', 'Condiciones de uso y exposición'),
  ('ANTROPICO', 'ANT_FALTA_DE_MANTENIMIENTO', 'Falta de mantenimiento'),
  ('ANTROPICO', 'ANT_CONTAMINACION_DEL_AMBIENTE', 'Contaminación del ambiente'),
  ('ANTROPICO', 'ANT_GENERACION_DE_RESIDUOS', 'Generación de residuos'),
  ('ANTROPICO', 'ANT_EXPANSION_URBANA', 'Expansión urbana'),
  ('ANTROPICO', 'ANT_CONFLICTO_POLITICO_SOCIAL', 'Conflicto político / social'),
  ('ANTROPICO', 'ANT_DESARROLLO_INDUSTRIAL_COMERCIAL', 'Desarrollo industrial / comercial'),
  ('ANTROPICO', 'ANT_VANDALISMO', 'Vandalismo'),
  ('ANTROPICO', 'ANT_OTRO', 'Otro')
ON CONFLICT (codigo) DO UPDATE SET
  origen = EXCLUDED.origen,
  nombre = EXCLUDED.nombre,
  activo = TRUE;

INSERT INTO categorias_servicio_basico (codigo, nombre)
VALUES
  ('AGUA', 'Agua'),
  ('ENERGIA', 'Energía'),
  ('SANEAMIENTO', 'Saneamiento'),
  ('DESECHOS', 'Disposición de desechos')
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  activo = TRUE;

INSERT INTO tipos_servicio_basico (categoria_servicio_basico_id, codigo, nombre)
SELECT parent.id, source.codigo, source.nombre
FROM (VALUES
  ('AGUA', 'AGUA_POTABLE', 'Potable'),
  ('AGUA', 'AGUA_POZO', 'Pozo'),
  ('AGUA', 'AGUA_TANQUERO', 'Tanquero'),
  ('AGUA', 'AGUA_ENTUBADA', 'Entubada'),
  ('AGUA', 'AGUA_RIO_VERTIENTE_ACEQUIA_O_CANAL', 'Río, vertiente, acequia o canal'),
  ('AGUA', 'AGUA_LLUVIA', 'Lluvia'),
  ('AGUA', 'AGUA_OTRO', 'Otro'),
  ('ENERGIA', 'ENERGIA_01', 'Red eléctrica de servicio público'),
  ('ENERGIA', 'ENERGIA_PANEL_SOLAR', 'Panel solar'),
  ('ENERGIA', 'ENERGIA_GENERADOR_DE_CORRIENTE_ELECTRICA', 'Generador de corriente eléctrica'),
  ('ENERGIA', 'ENERGIA_OTRO', 'Otro'),
  ('SANEAMIENTO', 'SANEAMIENTO_RED_PUBLICA', 'Red pública'),
  ('SANEAMIENTO', 'SANEAMIENTO_POZO_CIEGO', 'Pozo ciego'),
  ('SANEAMIENTO', 'SANEAMIENTO_POZO_SEPTICO', 'Pozo séptico'),
  ('SANEAMIENTO', 'SANEAMIENTO_04', 'Con descarga directa al mar, río o quebrada'),
  ('SANEAMIENTO', 'SANEAMIENTO_LETRINA', 'Letrina'),
  ('SANEAMIENTO', 'SANEAMIENTO_OTRO', 'Otro'),
  ('DESECHOS', 'DESECHOS_CARRO_RECOLECTOR', 'Carro Recolector'),
  ('DESECHOS', 'DESECHOS_TERRENO_BALDIO_O_QUEBRADA', 'Terreno baldío o quebrada'),
  ('DESECHOS', 'DESECHOS_QUEMA_DE_BASURA', 'Quema de basura'),
  ('DESECHOS', 'DESECHOS_BASURA_ENTERRADA', 'Basura enterrada'),
  ('DESECHOS', 'DESECHOS_05', 'Basura arrojada al rio, acequia o canal'),
  ('DESECHOS', 'DESECHOS_OTRO', 'Otro')
) AS source(categoria_codigo, codigo, nombre)
JOIN categorias_servicio_basico AS parent ON parent.codigo = source.categoria_codigo
ON CONFLICT (codigo) DO UPDATE SET
  categoria_servicio_basico_id = EXCLUDED.categoria_servicio_basico_id,
  nombre = EXCLUDED.nombre,
  activo = TRUE;

INSERT INTO tipos_senaletica (ambiente, codigo, nombre)
VALUES
  ('URBANA', 'URBANA_01', 'Pictograma de atractivos naturales'),
  ('URBANA', 'URBANA_02', 'Pictograma de atractivos culturales'),
  ('URBANA', 'URBANA_03', 'Pictograma de actividades turísticas'),
  ('URBANA', 'URBANA_04', 'Pictograma de servicios de apoyo'),
  ('URBANA', 'URBANA_05', 'Pictogramas de restricción'),
  ('URBANA', 'URBANA_06', 'Tótems de atractivos turísticos'),
  ('URBANA', 'URBANA_07', 'Tótems de sitio'),
  ('URBANA', 'URBANA_08', 'Tótems direccionales'),
  ('NATURAL', 'NATURAL_01', 'Pictograma de atractivos naturales'),
  ('NATURAL', 'NATURAL_02', 'Pictograma de atractivos culturales'),
  ('NATURAL', 'NATURAL_03', 'Pictograma de actividades turísticas'),
  ('NATURAL', 'NATURAL_04', 'Pictograma de servicios de apoyo'),
  ('NATURAL', 'NATURAL_05', 'Pictogramas de restricción'),
  ('NATURAL', 'NATURAL_06', 'Señales turísticas de aproximación'),
  ('NATURAL', 'NATURAL_07', 'Paneles de direccionamiento hacia atractivos'),
  ('NATURAL', 'NATURAL_08', 'Panel informativo de atractivos'),
  ('NATURAL', 'NATURAL_09', 'Panel informativo de direccionamiento hacia atractivos, servicios y actividades'),
  ('NATURAL', 'NATURAL_10', 'Mesas interpretativas'),
  ('NATURAL', 'NATURAL_11', 'Tótem de sitio'),
  ('NATURAL', 'NATURAL_12', 'Tótem de direccionamiento'),
  ('INFORMATIVA', 'INFORMATIVA_01', 'De información botánica'),
  ('INFORMATIVA', 'INFORMATIVA_02', 'Normativos de concienciación'),
  ('SEGURIDAD', 'SEGURIDAD_01', 'Protección de los elementos del atractivo'),
  ('OTROS', 'OTRO', 'Otros')
ON CONFLICT (codigo) DO UPDATE SET
  ambiente = EXCLUDED.ambiente,
  nombre = EXCLUDED.nombre,
  activo = TRUE;

INSERT INTO materiales_senaletica (codigo, nombre)
VALUES
  ('MADERA', 'Madera'),
  ('ALUMINIO', 'Aluminio'),
  ('OTRO', 'Otro')
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  activo = TRUE;

INSERT INTO tipos_servicio_salud (codigo, nombre)
VALUES
  ('HOSPITAL_CLINICA', 'Hospital o Clínica'),
  ('CENTRO_SALUD', 'Puesto / Centro de salud'),
  ('DISPENSARIO_MEDICO', 'Dispensario médico'),
  ('BOTIQUIN_PRIMEROS_AUXILIOS', 'Botiquín de primeros auxilios'),
  ('OTRO', 'Otros')
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  activo = TRUE;

INSERT INTO tipos_servicio_seguridad (codigo, nombre)
VALUES
  ('PRIVADA', 'Privada'),
  ('POLICIA_NACIONAL', 'Policía nacional'),
  ('POLICIA_MUNICIPAL', 'Policía metropolitana / Municipal'),
  ('OTRO', 'Otra')
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  activo = TRUE;

INSERT INTO tipos_comunicacion (grupo, codigo, nombre)
VALUES
  ('TELEFONIA', 'TELEFONIA_FIJA', 'Fija'),
  ('TELEFONIA', 'TELEFONIA_MOVIL', 'Móvil'),
  ('TELEFONIA', 'TELEFONIA_SATELITAL', 'Satelital'),
  ('INTERNET', 'INTERNET_LINEA_TELEFONICA', 'Línea telefónica'),
  ('INTERNET', 'INTERNET_FIBRA_OPTICA', 'Fibra óptica'),
  ('INTERNET', 'INTERNET_SATELITE', 'Satélite'),
  ('INTERNET', 'INTERNET_REDES_INALAMBRICAS', 'Redes inalámbricas'),
  ('INTERNET', 'INTERNET_TELEFONIA_MOVIL', 'Telefonía móvil')
ON CONFLICT (codigo) DO UPDATE SET
  grupo = EXCLUDED.grupo,
  nombre = EXCLUDED.nombre,
  activo = TRUE;

INSERT INTO tipos_amenaza (codigo, nombre)
VALUES
  ('AMENAZA_DESLAVES', 'Deslaves'),
  ('AMENAZA_SISMOS', 'Sismos'),
  ('AMENAZA_ERUPCIONES_VOLCANICAS', 'Erupciones volcánicas'),
  ('AMENAZA_INCENDIOS_FORESTALES', 'Incendios forestales'),
  ('AMENAZA_SEQUIA', 'Sequía'),
  ('AMENAZA_INUNDACIONES', 'Inundaciones'),
  ('AMENAZA_AGUAJES', 'Aguajes'),
  ('AMENAZA_TSUNAMI', 'Tsunami')
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  activo = TRUE;

INSERT INTO preguntas_politica (codigo, pregunta, orden)
VALUES
  ('PLAN_DESARROLLO_GAD', '¿El atractivo se encuentra dentro del plan de desarrollo turístico del GAD?', 1),
  ('PLANIFICACION_TERRITORIAL', 'b. ¿El atractivo se encuentra dentro de la planificación turística territorial (GAD´S)?', 2),
  ('REGULACIONES_APLICABLES', 'c. ¿Existen normativas que se apliquen para el desarrollo de la actividad turística en el atractivo?', 3),
  ('ORDENANZAS_APLICABLES', 'd. ¿Existen ordenanzas que se apliquen para el desarrollo de la actividad turística en el atractivo?', 4)
ON CONFLICT (codigo) DO UPDATE SET
  pregunta = EXCLUDED.pregunta,
  orden = EXCLUDED.orden,
  activo = TRUE;

INSERT INTO grupos_actividad (categoria_atractivo_id, codigo, nombre)
SELECT parent.id, source.codigo, source.nombre
FROM (VALUES
  ('AN', 'AGUA', 'Agua'),
  ('AN', 'AIRE', 'Aire'),
  ('AN', 'TIERRA', 'Tierra'),
  ('MC', 'CULTURA', 'Actividades culturales')
) AS source(categoria_codigo, codigo, nombre)
JOIN categorias_atractivo AS parent ON parent.codigo = source.categoria_codigo
ON CONFLICT (codigo) DO UPDATE SET
  categoria_atractivo_id = EXCLUDED.categoria_atractivo_id,
  nombre = EXCLUDED.nombre,
  activo = TRUE;

INSERT INTO actividades_turisticas (grupo_actividad_id, codigo, nombre)
SELECT parent.id, source.codigo, source.nombre
FROM (VALUES
  ('AGUA', 'BUCEO', 'Buceo'),
  ('AGUA', 'AGUA_KAYAK_DE_MAR', 'Kayak de mar'),
  ('AGUA', 'AGUA_KAYAK_LACUSTRE', 'Kayak lacustre'),
  ('AGUA', 'AGUA_KAYAK_DE_RIO', 'Kayak de Río'),
  ('AGUA', 'AGUA_SURF', 'Surf'),
  ('AGUA', 'AGUA_KITE_SURF', 'Kite surf'),
  ('AGUA', 'RAFTING', 'Rafting'),
  ('AGUA', 'AGUA_SNORKEL', 'Snorkel'),
  ('AGUA', 'AGUA_TUBING', 'Tubing'),
  ('AGUA', 'AGUA_REGATA', 'Regata'),
  ('AGUA', 'AGUA_PASEO_EN_PANGA', 'Paseo en panga'),
  ('AGUA', 'AGUA_PASEO_EN_BOTE', 'Paseo en bote'),
  ('AGUA', 'AGUA_PASEO_EN_LANCHA', 'Paseo en lancha'),
  ('AGUA', 'AGUA_PASEO_EN_MOTO_ACUATICA', 'Paseo en moto acuática'),
  ('AGUA', 'AGUA_PARASAILING', 'Parasailing'),
  ('AGUA', 'AGUA_ESQUI_ACUATICO', 'Esquí acuático'),
  ('AGUA', 'AGUA_BANANA_FLOTANTE', 'Banana flotante'),
  ('AGUA', 'AGUA_BOYA', 'Boya'),
  ('AGUA', 'PESCA_DEPORTIVA', 'Pesca deportiva'),
  ('AGUA', 'AGUA_OTRO', 'Otro'),
  ('AIRE', 'ALA_DELTA', 'Alas Delta'),
  ('AIRE', 'CANOPY', 'Canopy'),
  ('AIRE', 'PARAPENTE', 'Parapente'),
  ('AIRE', 'AIRE_OTRO', 'Otro'),
  ('TIERRA', 'MONTANISMO', 'Montañismo'),
  ('TIERRA', 'ESCALADA', 'Escalada'),
  ('TIERRA', 'SENDERISMO', 'Senderismo'),
  ('TIERRA', 'CICLOTURISMO', 'Cicloturismo'),
  ('TIERRA', 'TIERRA_CANYONING', 'Canyoning'),
  ('TIERRA', 'TIERRA_EXPLORACION_DE_CUEVAS', 'Exploración de cuevas'),
  ('TIERRA', 'TIERRA_ACTIVIDADES_RECREATIVAS', 'Actividades Recreativas'),
  ('TIERRA', 'CABALGATA', 'Cabalgata'),
  ('TIERRA', 'CAMINATA', 'Caminata'),
  ('TIERRA', 'CAMPING', 'Camping'),
  ('TIERRA', 'PICNIC', 'Picnic'),
  ('TIERRA', 'OBSERVACION_FLORA_FAUNA', 'Observación de flora y fauna'),
  ('TIERRA', 'TIERRA_OBSERVACION_DE_ASTROS', 'Observación de astros'),
  ('TIERRA', 'TIERRA_OTRO', 'Otro'),
  ('CULTURA', 'RECORRIDO_GUIADO', 'Recorridos guiados'),
  ('CULTURA', 'CULTURA_RECORRIDO_AUTOGUIADOS', 'Recorrido autoguiados'),
  ('CULTURA', 'CULTURA_VISITA_A_TALLERES_ARTISTICOS', 'Visita a talleres artísticos'),
  ('CULTURA', 'CULTURA_PARTICIPACION_EN_TALLERES_ARTISTICOS', 'Participación en talleres artísticos'),
  ('CULTURA', 'CULTURA_VISITA_A_TALLERES_ARTESANALES', 'Visita a talleres artesanales'),
  ('CULTURA', 'CULTURA_PARTICIPACION_EN_TALLERES_ARTESANALES', 'Participación en talleres artesanales'),
  ('CULTURA', 'CULTURA_07', 'Exposiciones temáticas permanentes, temporales y eventuales'),
  ('CULTURA', 'CULTURA_08', 'Exhibición de piezas, muestras, obras, etc., originales.'),
  ('CULTURA', 'CULTURA_ACTIVIDADES_VIVENCIALES_Y_O_LUDICAS', 'Actividades vivenciales y/o lúdicas'),
  ('CULTURA', 'CULTURA_PRESENTACIONES_O_REPRESENTACIONES_EN_VIVO', 'Presentaciones o representaciones en vivo'),
  ('CULTURA', 'CULTURA_MUESTRAS_AUDIOVISUALES', 'Muestras audiovisuales'),
  ('CULTURA', 'FOTOGRAFIA', 'Fotografía'),
  ('CULTURA', 'DEGUSTACION', 'Degustación de platos tradicionales'),
  ('CULTURA', 'CELEBRACIONES', 'Participación de la celebración'),
  ('CULTURA', 'ARTESANIAS', 'Compra de artesanías'),
  ('CULTURA', 'CULTURA_CONVIVENCIA', 'Convivencia'),
  ('CULTURA', 'MEDICINA_ANCESTRAL', 'Medicina ancestral'),
  ('CULTURA', 'CULTURA_OTRO', 'Otro')
) AS source(grupo_codigo, codigo, nombre)
JOIN grupos_actividad AS parent ON parent.codigo = source.grupo_codigo
ON CONFLICT (codigo) DO UPDATE SET
  grupo_actividad_id = EXCLUDED.grupo_actividad_id,
  nombre = EXCLUDED.nombre,
  activo = TRUE;

INSERT INTO tipos_medio_promocion (codigo, nombre)
VALUES
  ('PAGINA_WEB', 'Página WEB'),
  ('RED_SOCIAL', 'Red Social'),
  ('REVISTA_ESPECIALIZADA', 'Revistas Especializadas'),
  ('MATERIAL_POP', 'Material POP'),
  ('OFICINA_INFORMACION_TURISTICA', 'Oficina de Información Turística'),
  ('MEDIOS_COMUNICACION', 'Medios de comunicación (radio, tv, prensa)'),
  ('FERIAS_TURISTICAS', 'Asistencia a ferias turísticas'),
  ('OTRO', 'Otro')
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  activo = TRUE;

INSERT INTO tipos_formacion_personal (grupo, codigo, nombre)
VALUES
  ('EDUCACION', 'EDUCACION_PRIMARIA', 'Primaria'),
  ('EDUCACION', 'EDUCACION_SECUNDARIA', 'Secundaria'),
  ('EDUCACION', 'EDUCACION_TERCER_NIVEL', 'Tercer Nivel'),
  ('EDUCACION', 'EDUCACION_CUARTO_NIVEL', 'Cuarto Nivel'),
  ('EDUCACION', 'EDUCACION_OTRO', 'Otro'),
  ('CAPACITACION', 'CAPACITACION_PRIMEROS_AUXILIOS', 'Primeros Auxilios'),
  ('CAPACITACION', 'CAPACITACION_HOSPITALIDAD', 'Hospitalidad'),
  ('CAPACITACION', 'CAPACITACION_ATENCION_AL_CLIENTE', 'Atención al Cliente'),
  ('CAPACITACION', 'CAPACITACION_GUIANZA', 'Guianza'),
  ('CAPACITACION', 'CAPACITACION_05', 'Sensibilización de discapacidades'),
  ('CAPACITACION', 'CAPACITACION_OTRO', 'Otro'),
  ('IDIOMA', 'IDIOMA_INGLES', 'Inglés'),
  ('IDIOMA', 'IDIOMA_ALEMAN', 'Alemán'),
  ('IDIOMA', 'IDIOMA_FRANCES', 'Francés'),
  ('IDIOMA', 'IDIOMA_ITALIANO', 'Italiano'),
  ('IDIOMA', 'IDIOMA_CHINO', 'Chino'),
  ('IDIOMA', 'IDIOMA_OTRO', 'Otro')
ON CONFLICT (codigo) DO UPDATE SET
  grupo = EXCLUDED.grupo,
  nombre = EXCLUDED.nombre,
  activo = TRUE;

-- Verificaciones de presencia de todos los códigos fuente.
DO $$
BEGIN
IF (SELECT COUNT(*) FROM tipos_transporte WHERE activo AND codigo IN ('BUS', 'BUSETA', 'TRANSPORTE_4X4', 'TAXI', 'MOTOTAXI', 'TELEFERICO', 'LANCHA', 'BOTE', 'BARCO', 'CANOA', 'AVION', 'AVIONETA', 'HELICOPTERO', 'OTRO')) <> 14 THEN
  RAISE EXCEPTION 'XLSM seed check failed for tipos_transporte: expected 14 active source rows';
END IF;
IF (SELECT COUNT(*) FROM frecuencias_servicio WHERE activo AND codigo IN ('DIARIO', 'SEMANAL', 'MENSUAL', 'EVENTUAL')) <> 4 THEN
  RAISE EXCEPTION 'XLSM seed check failed for frecuencias_servicio: expected 4 active source rows';
END IF;
IF (SELECT COUNT(*) FROM criterios_accesibilidad WHERE activo AND codigo IN ('GENERAL_01', 'GENERAL_02', 'GENERAL_03', 'GENERAL_04', 'GENERAL_05', 'GENERAL_06', 'GENERAL_07', 'GENERAL_08', 'GENERAL_09', 'GENERAL_10', 'GENERAL_11', 'GENERAL_12', 'GENERAL_13', 'GENERAL_14', 'FISICA_01', 'FISICA_02', 'FISICA_03', 'FISICA_04', 'FISICA_05', 'FISICA_06', 'FISICA_07', 'FISICA_08', 'FISICA_09', 'FISICA_10', 'FISICA_11', 'FISICA_12', 'FISICA_13', 'FISICA_14', 'VISUAL_01', 'VISUAL_02', 'VISUAL_03', 'VISUAL_04', 'VISUAL_05', 'VISUAL_06', 'VISUAL_07', 'VISUAL_08', 'VISUAL_09', 'VISUAL_10', 'VISUAL_11', 'VISUAL_12', 'AUDITIVA_01', 'AUDITIVA_02', 'AUDITIVA_03', 'AUDITIVA_04', 'AUDITIVA_05', 'AUDITIVA_06', 'AUDITIVA_07', 'COGNITIVA_01', 'COGNITIVA_02', 'COGNITIVA_03', 'COGNITIVA_04')) <> 51 THEN
  RAISE EXCEPTION 'XLSM seed check failed for criterios_accesibilidad: expected 51 active source rows';
END IF;
IF (SELECT COUNT(*) FROM tipos_planta_turistica WHERE activo AND codigo IN ('ALOJAMIENTO_HOTEL', 'ALOJAMIENTO_HOSTAL', 'ALOJAMIENTO_HOSTERIA', 'ALOJAMIENTO_HACIENDA_TURISTICA', 'ALOJAMIENTO_LODGE', 'ALOJAMIENTO_RESORT', 'ALOJAMIENTO_REFUGIO', 'ALOJAMIENTO_CAMPAMENTO_TURISTICO', 'ALOJAMIENTO_CASA_DE_HUESPEDES', 'ALIMENTOS_RESTAURANTES', 'ALIMENTOS_CAFETERIAS', 'ALIMENTOS_BARES', 'ALIMENTOS_FUENTES_DE_SODA', 'AGENCIA_MAYORISTAS', 'AGENCIA_INTERNACIONALES', 'AGENCIA_OPERADORAS', 'GUIA_LOCAL', 'GUIA_NACIONAL', 'GUIA_NACIONAL_ESPECIALIZADO_EN_CULTURA', 'GUIA_NACIONAL_ESPECIALIZADO_EN_AVENTURA')) <> 20 THEN
  RAISE EXCEPTION 'XLSM seed check failed for tipos_planta_turistica: expected 20 active source rows';
END IF;
IF (SELECT COUNT(*) FROM categorias_facilidad WHERE activo AND codigo IN ('GESTION', 'OBSERVACION', 'RECORRIDO', 'SERVICIO', 'OTROS')) <> 5 THEN
  RAISE EXCEPTION 'XLSM seed check failed for categorias_facilidad: expected 5 active source rows';
END IF;
IF (SELECT COUNT(*) FROM tipos_facilidad WHERE activo AND codigo IN ('PUNTO_INFORMACION', 'I_TUR', 'CENTRO_INTERPRETACION', 'CENTRO_FACILITACION', 'CENTRO_RECEPCION', 'GARITA', 'MIRADOR', 'TORRE_AVISTAMIENTO', 'TORRE_SALVAVIDAS', 'SENDERO', 'SOMBRA_DESCANSO', 'AREA_ACAMPAR', 'REFUGIO_MONTAÑA', 'BATERIA_SANITARIA', 'ESTACIONAMIENTO', 'OTRO')) <> 16 THEN
  RAISE EXCEPTION 'XLSM seed check failed for tipos_facilidad: expected 16 active source rows';
END IF;
IF (SELECT COUNT(*) FROM tipos_servicio_complementario WHERE activo AND codigo IN ('ALQUILER_VENTA_EQUIPO', 'VENTA_ARTESANIAS_MERCH', 'CASA_CAMBIO', 'CAJERO_AUTOMATICO', 'OTRO')) <> 5 THEN
  RAISE EXCEPTION 'XLSM seed check failed for tipos_servicio_complementario: expected 5 active source rows';
END IF;
IF (SELECT COUNT(*) FROM estados_conservacion WHERE activo AND codigo IN ('CONSERVADO', 'ALTERADO', 'EN_PROCESO_DE_DETERIORO', 'DETERIORADO')) <> 4 THEN
  RAISE EXCEPTION 'XLSM seed check failed for estados_conservacion: expected 4 active source rows';
END IF;
IF (SELECT COUNT(*) FROM factores_alteracion WHERE activo AND codigo IN ('NAT_EROSION', 'NAT_HUMEDAD', 'NAT_DESASTRES_NATURALES', 'NAT_FLORA_FAUNA', 'NAT_CLIMA', 'NAT_OTRO', 'ANT_ACTIVIDADES_AGRICOLAS_Y_GANADERAS', 'ANT_ACTIVIDADES_FORESTALES', 'ANT_ACTIVIDADES_EXTRACTIVAS_MINERIA', 'ANT_ACTIVIDADES_INDUSTRIALES', 'ANT_NEGLIGENCIA_ABANDONO', 'ANT_HUAQUEARIA', 'ANT_CONFLICTO_DE_TENENCIA', 'ANT_CONDICIONES_DE_USO_Y_EXPOSICION', 'ANT_FALTA_DE_MANTENIMIENTO', 'ANT_CONTAMINACION_DEL_AMBIENTE', 'ANT_GENERACION_DE_RESIDUOS', 'ANT_EXPANSION_URBANA', 'ANT_CONFLICTO_POLITICO_SOCIAL', 'ANT_DESARROLLO_INDUSTRIAL_COMERCIAL', 'ANT_VANDALISMO', 'ANT_OTRO')) <> 22 THEN
  RAISE EXCEPTION 'XLSM seed check failed for factores_alteracion: expected 22 active source rows';
END IF;
IF (SELECT COUNT(*) FROM categorias_servicio_basico WHERE activo AND codigo IN ('AGUA', 'ENERGIA', 'SANEAMIENTO', 'DESECHOS')) <> 4 THEN
  RAISE EXCEPTION 'XLSM seed check failed for categorias_servicio_basico: expected 4 active source rows';
END IF;
IF (SELECT COUNT(*) FROM tipos_servicio_basico WHERE activo AND codigo IN ('AGUA_POTABLE', 'AGUA_POZO', 'AGUA_TANQUERO', 'AGUA_ENTUBADA', 'AGUA_RIO_VERTIENTE_ACEQUIA_O_CANAL', 'AGUA_LLUVIA', 'AGUA_OTRO', 'ENERGIA_01', 'ENERGIA_PANEL_SOLAR', 'ENERGIA_GENERADOR_DE_CORRIENTE_ELECTRICA', 'ENERGIA_OTRO', 'SANEAMIENTO_RED_PUBLICA', 'SANEAMIENTO_POZO_CIEGO', 'SANEAMIENTO_POZO_SEPTICO', 'SANEAMIENTO_04', 'SANEAMIENTO_LETRINA', 'SANEAMIENTO_OTRO', 'DESECHOS_CARRO_RECOLECTOR', 'DESECHOS_TERRENO_BALDIO_O_QUEBRADA', 'DESECHOS_QUEMA_DE_BASURA', 'DESECHOS_BASURA_ENTERRADA', 'DESECHOS_05', 'DESECHOS_OTRO')) <> 23 THEN
  RAISE EXCEPTION 'XLSM seed check failed for tipos_servicio_basico: expected 23 active source rows';
END IF;
IF (SELECT COUNT(*) FROM tipos_senaletica WHERE activo AND codigo IN ('URBANA_01', 'URBANA_02', 'URBANA_03', 'URBANA_04', 'URBANA_05', 'URBANA_06', 'URBANA_07', 'URBANA_08', 'NATURAL_01', 'NATURAL_02', 'NATURAL_03', 'NATURAL_04', 'NATURAL_05', 'NATURAL_06', 'NATURAL_07', 'NATURAL_08', 'NATURAL_09', 'NATURAL_10', 'NATURAL_11', 'NATURAL_12', 'INFORMATIVA_01', 'INFORMATIVA_02', 'SEGURIDAD_01', 'OTRO')) <> 24 THEN
  RAISE EXCEPTION 'XLSM seed check failed for tipos_senaletica: expected 24 active source rows';
END IF;
IF (SELECT COUNT(*) FROM materiales_senaletica WHERE activo AND codigo IN ('MADERA', 'ALUMINIO', 'OTRO')) <> 3 THEN
  RAISE EXCEPTION 'XLSM seed check failed for materiales_senaletica: expected 3 active source rows';
END IF;
IF (SELECT COUNT(*) FROM tipos_servicio_salud WHERE activo AND codigo IN ('HOSPITAL_CLINICA', 'CENTRO_SALUD', 'DISPENSARIO_MEDICO', 'BOTIQUIN_PRIMEROS_AUXILIOS', 'OTRO')) <> 5 THEN
  RAISE EXCEPTION 'XLSM seed check failed for tipos_servicio_salud: expected 5 active source rows';
END IF;
IF (SELECT COUNT(*) FROM tipos_servicio_seguridad WHERE activo AND codigo IN ('PRIVADA', 'POLICIA_NACIONAL', 'POLICIA_MUNICIPAL', 'OTRO')) <> 4 THEN
  RAISE EXCEPTION 'XLSM seed check failed for tipos_servicio_seguridad: expected 4 active source rows';
END IF;
IF (SELECT COUNT(*) FROM tipos_comunicacion WHERE activo AND codigo IN ('TELEFONIA_FIJA', 'TELEFONIA_MOVIL', 'TELEFONIA_SATELITAL', 'INTERNET_LINEA_TELEFONICA', 'INTERNET_FIBRA_OPTICA', 'INTERNET_SATELITE', 'INTERNET_REDES_INALAMBRICAS', 'INTERNET_TELEFONIA_MOVIL')) <> 8 THEN
  RAISE EXCEPTION 'XLSM seed check failed for tipos_comunicacion: expected 8 active source rows';
END IF;
IF (SELECT COUNT(*) FROM tipos_amenaza WHERE activo AND codigo IN ('AMENAZA_DESLAVES', 'AMENAZA_SISMOS', 'AMENAZA_ERUPCIONES_VOLCANICAS', 'AMENAZA_INCENDIOS_FORESTALES', 'AMENAZA_SEQUIA', 'AMENAZA_INUNDACIONES', 'AMENAZA_AGUAJES', 'AMENAZA_TSUNAMI')) <> 8 THEN
  RAISE EXCEPTION 'XLSM seed check failed for tipos_amenaza: expected 8 active source rows';
END IF;
IF (SELECT COUNT(*) FROM preguntas_politica WHERE activo AND codigo IN ('PLAN_DESARROLLO_GAD', 'PLANIFICACION_TERRITORIAL', 'REGULACIONES_APLICABLES', 'ORDENANZAS_APLICABLES')) <> 4 THEN
  RAISE EXCEPTION 'XLSM seed check failed for preguntas_politica: expected 4 active source rows';
END IF;
IF (SELECT COUNT(*) FROM actividades_turisticas WHERE activo AND codigo IN ('BUCEO', 'AGUA_KAYAK_DE_MAR', 'AGUA_KAYAK_LACUSTRE', 'AGUA_KAYAK_DE_RIO', 'AGUA_SURF', 'AGUA_KITE_SURF', 'RAFTING', 'AGUA_SNORKEL', 'AGUA_TUBING', 'AGUA_REGATA', 'AGUA_PASEO_EN_PANGA', 'AGUA_PASEO_EN_BOTE', 'AGUA_PASEO_EN_LANCHA', 'AGUA_PASEO_EN_MOTO_ACUATICA', 'AGUA_PARASAILING', 'AGUA_ESQUI_ACUATICO', 'AGUA_BANANA_FLOTANTE', 'AGUA_BOYA', 'PESCA_DEPORTIVA', 'AGUA_OTRO', 'ALA_DELTA', 'CANOPY', 'PARAPENTE', 'AIRE_OTRO', 'MONTANISMO', 'ESCALADA', 'SENDERISMO', 'CICLOTURISMO', 'TIERRA_CANYONING', 'TIERRA_EXPLORACION_DE_CUEVAS', 'TIERRA_ACTIVIDADES_RECREATIVAS', 'CABALGATA', 'CAMINATA', 'CAMPING', 'PICNIC', 'OBSERVACION_FLORA_FAUNA', 'TIERRA_OBSERVACION_DE_ASTROS', 'TIERRA_OTRO', 'RECORRIDO_GUIADO', 'CULTURA_RECORRIDO_AUTOGUIADOS', 'CULTURA_VISITA_A_TALLERES_ARTISTICOS', 'CULTURA_PARTICIPACION_EN_TALLERES_ARTISTICOS', 'CULTURA_VISITA_A_TALLERES_ARTESANALES', 'CULTURA_PARTICIPACION_EN_TALLERES_ARTESANALES', 'CULTURA_07', 'CULTURA_08', 'CULTURA_ACTIVIDADES_VIVENCIALES_Y_O_LUDICAS', 'CULTURA_PRESENTACIONES_O_REPRESENTACIONES_EN_VIVO', 'CULTURA_MUESTRAS_AUDIOVISUALES', 'FOTOGRAFIA', 'DEGUSTACION', 'CELEBRACIONES', 'ARTESANIAS', 'CULTURA_CONVIVENCIA', 'MEDICINA_ANCESTRAL', 'CULTURA_OTRO')) <> 56 THEN
  RAISE EXCEPTION 'XLSM seed check failed for actividades_turisticas: expected 56 active source rows';
END IF;
IF (SELECT COUNT(*) FROM tipos_medio_promocion WHERE activo AND codigo IN ('PAGINA_WEB', 'RED_SOCIAL', 'REVISTA_ESPECIALIZADA', 'MATERIAL_POP', 'OFICINA_INFORMACION_TURISTICA', 'MEDIOS_COMUNICACION', 'FERIAS_TURISTICAS', 'OTRO')) <> 8 THEN
  RAISE EXCEPTION 'XLSM seed check failed for tipos_medio_promocion: expected 8 active source rows';
END IF;
IF (SELECT COUNT(*) FROM tipos_formacion_personal WHERE activo AND codigo IN ('EDUCACION_PRIMARIA', 'EDUCACION_SECUNDARIA', 'EDUCACION_TERCER_NIVEL', 'EDUCACION_CUARTO_NIVEL', 'EDUCACION_OTRO', 'CAPACITACION_PRIMEROS_AUXILIOS', 'CAPACITACION_HOSPITALIDAD', 'CAPACITACION_ATENCION_AL_CLIENTE', 'CAPACITACION_GUIANZA', 'CAPACITACION_05', 'CAPACITACION_OTRO', 'IDIOMA_INGLES', 'IDIOMA_ALEMAN', 'IDIOMA_FRANCES', 'IDIOMA_ITALIANO', 'IDIOMA_CHINO', 'IDIOMA_OTRO')) <> 17 THEN
  RAISE EXCEPTION 'XLSM seed check failed for tipos_formacion_personal: expected 17 active source rows';
END IF;
END;
$$;

COMMIT;
