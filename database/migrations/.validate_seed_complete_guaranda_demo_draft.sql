-- Completa el borrador de la ficha existente Centro Cultural Indio Guaranga.
--
-- Este seed solo modifica el snapshot administrativo remoto. La ficha pública permanece
-- aislada en centros_turisticos y las revisiones históricas no se reescriben.
-- Todos los textos, cantidades, fechas, contactos y URLs son referenciales de demostración;
-- deben validarse institucionalmente antes de solicitar una publicación productiva.
-- No se crean binarios multimedia: los documentos institucionales quedan pendientes.


SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- Catálogos que el despliegue dejó fuera del seed operativo, necesarios para hidratar los
-- controles de clima y material de vía sin usar IDs fijos.
INSERT INTO catalogo_clima (codigo, nombre, descripcion, activo)
VALUES (
  'TEMPLADO_ANDINO_DEMO',
  'Templado andino (referencial demo)',
  'Opción creada exclusivamente para completar una ficha de demostración; validar con fuente climática institucional.',
  TRUE
)
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  activo = TRUE,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO materiales_via (codigo, nombre, activo)
VALUES (
  'ADOQUIN_DEMO',
  'Adoquín (referencial demo)',
  TRUE
)
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  activo = TRUE;

DO $$
DECLARE
  actor_id BIGINT := 1;
  center_id BIGINT;
  center_code TEXT;
  center_name TEXT;
  draft_id BIGINT;
  draft_version INTEGER;
  old_data JSONB;
  new_data JSONB;
  demo_sections JSONB;
  locality_id BIGINT;
  climate_id BIGINT;
  road_material_id BIGINT;
  center_count INTEGER;
  activity_count INTEGER;
  facility_count INTEGER;
  required_catalog_count INTEGER;
  demo_note CONSTANT TEXT := 'Dato referencial de demostración; información inventada para completar la ficha de prueba. Validar institucionalmente antes de publicar.';
  demo_description CONSTANT TEXT := 'Espacio cultural referencial para conocer expresiones, memoria y actividades de la identidad guarandeña. Este contenido fue creado para demostración del editor administrativo y debe validarse con la administración local antes de cualquier publicación.';
BEGIN
  SELECT count(*)::INTEGER
  INTO center_count
  FROM centros_turisticos
  WHERE nombre = 'Centro Cultural Indio Guaranga';

  IF center_count <> 1 THEN
    RAISE EXCEPTION 'Se esperaba una ficha Centro Cultural Indio Guaranga y se encontraron %', center_count;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM usuarios WHERE id = actor_id) THEN
    RAISE EXCEPTION 'No existe el usuario de auditoría %', actor_id;
  END IF;

  SELECT c.id, trim(c.codigo_atractivo), c.nombre
  INTO center_id, center_code, center_name
  FROM centros_turisticos c
  WHERE c.nombre = 'Centro Cultural Indio Guaranga'
  FOR UPDATE;

  SELECT b.id, b.version, b.datos
  INTO draft_id, draft_version, old_data
  FROM borradores_centros_turisticos b
  WHERE b.centro_turistico_id = center_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La ficha % no tiene borrador administrativo; se aborta para no crear otro centro', center_code;
  END IF;

  SELECT z.localidad_id
  INTO locality_id
  FROM zonas_turisticas z
  WHERE z.id = NULLIF(old_data->>'touristZoneId', '')::BIGINT
    AND z.activo;

  SELECT id
  INTO climate_id
  FROM catalogo_clima
  WHERE codigo = 'TEMPLADO_ANDINO_DEMO'
    AND activo;

  SELECT id
  INTO road_material_id
  FROM materiales_via
  WHERE codigo = 'ADOQUIN_DEMO'
    AND activo;

  IF locality_id IS NULL OR climate_id IS NULL OR road_material_id IS NULL THEN
    RAISE EXCEPTION 'No se pudieron resolver los catálogos demo de localidad, clima o material de vía';
  END IF;

  SELECT count(*)::INTEGER
  INTO activity_count
  FROM actividades_turisticas a
  WHERE a.activo
    AND a.codigo IN (
      'ARTESANIAS',
      'DEGUSTACION',
      'CULTURA_MUESTRAS_AUDIOVISUALES',
      'CULTURA_PRESENTACIONES_O_REPRESENTACIONES_EN_VIVO',
      'CULTURA_08',
      'CULTURA_07',
      'CULTURA_RECORRIDO_AUTOGUIADOS'
    );

  IF activity_count <> 7 THEN
    RAISE EXCEPTION 'Se esperaban siete actividades catalogadas y se encontraron %', activity_count;
  END IF;

  SELECT count(*)::INTEGER
  INTO facility_count
  FROM tipos_facilidad f
  WHERE f.activo
    AND f.codigo IN ('CENTRO_RECEPCION', 'PUNTO_INFORMACION', 'BATERIA_SANITARIA', 'ESTACIONAMIENTO');

  IF facility_count <> 4 THEN
    RAISE EXCEPTION 'Se esperaban cuatro tipos de facilidad y se encontraron %', facility_count;
  END IF;

  SELECT count(*)::INTEGER
  INTO required_catalog_count
  FROM (
    SELECT 1 FROM tipos_via_terrestre WHERE codigo = 'PRIMER_ORDEN' AND activo
    UNION ALL SELECT 1 FROM estados_condicion WHERE codigo = 'BUENO' AND activo
    UNION ALL SELECT 1 FROM tipos_transporte WHERE codigo IN ('BUS', 'TAXI') AND activo
    UNION ALL SELECT 1 FROM frecuencias_servicio WHERE codigo = 'DIARIO' AND activo
    UNION ALL SELECT 1 FROM tipos_accesibilidad WHERE codigo IN ('GENERAL', 'FISICA') AND activo
    UNION ALL SELECT 1 FROM criterios_accesibilidad WHERE codigo IN ('GENERAL_06', 'GENERAL_11', 'FISICA_01') AND activo
    UNION ALL SELECT 1 FROM tipos_planta_turistica WHERE codigo IN ('ALIMENTOS_CAFETERIAS', 'ALIMENTOS_RESTAURANTES', 'GUIA_LOCAL') AND activo
    UNION ALL SELECT 1 FROM tipos_servicio_complementario WHERE codigo IN ('VENTA_ARTESANIAS_MERCH', 'OTRO') AND activo
    UNION ALL SELECT 1 FROM estados_conservacion WHERE codigo IN ('CONSERVADO', 'ALTERADO') AND activo
    UNION ALL SELECT 1 FROM factores_alteracion WHERE codigo IN ('NAT_HUMEDAD', 'NAT_CLIMA', 'ANT_NEGLIGENCIA_ABANDONO') AND activo
    UNION ALL SELECT 1 FROM tipos_servicio_basico WHERE codigo = 'AGUA_POTABLE' AND activo
    UNION ALL SELECT 1 FROM tipos_senaletica WHERE codigo = 'URBANA_02' AND activo
    UNION ALL SELECT 1 FROM materiales_senaletica WHERE codigo = 'MADERA' AND activo
    UNION ALL SELECT 1 FROM tipos_servicio_salud WHERE codigo = 'BOTIQUIN_PRIMEROS_AUXILIOS' AND activo
    UNION ALL SELECT 1 FROM tipos_servicio_seguridad WHERE codigo = 'POLICIA_MUNICIPAL' AND activo
    UNION ALL SELECT 1 FROM tipos_comunicacion WHERE codigo = 'INTERNET_REDES_INALAMBRICAS' AND activo
    UNION ALL SELECT 1 FROM tipos_amenaza WHERE codigo = 'AMENAZA_SISMOS' AND activo
    UNION ALL SELECT 1 FROM tipos_medio_promocion WHERE codigo IN ('PAGINA_WEB', 'RED_SOCIAL', 'OFICINA_INFORMACION_TURISTICA') AND activo
    UNION ALL SELECT 1 FROM tipos_formacion_personal WHERE codigo IN ('EDUCACION_TERCER_NIVEL', 'CAPACITACION_PRIMEROS_AUXILIOS', 'IDIOMA_INGLES') AND activo
    UNION ALL SELECT 1 FROM tipos_responsabilidad_ficha WHERE codigo IN ('ELABORO', 'VALIDO')
  ) AS required_catalogs;

  IF required_catalog_count <> 30 THEN
    RAISE EXCEPTION 'Faltan opciones de catálogo para completar la ficha; se resolvieron % de 30', required_catalog_count;
  END IF;

  demo_sections := jsonb_build_object(
    'identificacion', jsonb_build_object(
      'schemaVersion', 1,
      'response', 'SI',
      'observation', demo_note,
      'rows', jsonb_build_array(
        jsonb_build_object('label', 'Nombre del atractivo', 'response', 'SI', 'quantity', 1, 'observation', 'Centro Cultural Indio Guaranga (referencial demo).'),
        jsonb_build_object('label', 'Categoría: Manifestaciones culturales', 'response', 'SI', 'quantity', 1, 'observation', demo_note),
        jsonb_build_object('label', 'Tipo: Manifestaciones históricas', 'response', 'SI', 'quantity', 1, 'observation', demo_note),
        jsonb_build_object('label', 'Subtipo: Infraestructura Cultural', 'response', 'SI', 'quantity', 1, 'observation', demo_note),
        jsonb_build_object('label', 'Código institucional ' || center_code, 'response', 'SI', 'quantity', 1, 'observation', demo_note)
      )
    ),
    'ubicacion-admin', jsonb_build_object(
      'schemaVersion', 1,
      'response', 'SI',
      'observation', demo_note,
      'rows', jsonb_build_array(
        jsonb_build_object('label', 'Localidad: Guaranda', 'response', 'SI', 'quantity', 1, 'observation', demo_note),
        jsonb_build_object('label', 'Parroquia: Ángel Polibio Cháves', 'response', 'SI', 'quantity', 1, 'observation', demo_note),
        jsonb_build_object('label', 'Coordenadas -1.592630, -79.000980', 'response', 'SI', 'quantity', 1, 'observation', 'Coordenadas referenciales de demostración.'),
        jsonb_build_object('label', 'Dirección: Calle Convención y Calle Sucre', 'response', 'SI', 'quantity', 1, 'observation', demo_note),
        jsonb_build_object('label', 'Responsable: Administración municipal de Guaranda', 'response', 'SI', 'quantity', 1, 'observation', demo_note)
      )
    ),
    'caracteristicas', jsonb_build_object(
      'schemaVersion', 1,
      'response', 'SI',
      'observation', demo_note,
      'climate', jsonb_build_object(
        'climateId', climate_id,
        'minTemperature', 10.5,
        'maxTemperature', 19.5,
        'minRainfall', 500,
        'maxRainfall', 950
      ),
      'rows', jsonb_build_array(
        jsonb_build_object('label', 'Clima templado andino', 'response', 'SI', 'quantity', 1, 'observation', demo_note),
        jsonb_build_object('label', 'Temperatura referencial de 10,5 a 19,5 °C', 'response', 'SI', 'quantity', 1, 'observation', demo_note),
        jsonb_build_object('label', 'Precipitación referencial de 500 a 950 mm', 'response', 'SI', 'quantity', 1, 'observation', demo_note),
        jsonb_build_object('label', 'Atención de 08:00 a 18:00; tarifa demo de 1,50 a 3,00', 'response', 'SI', 'quantity', 1, 'observation', demo_note),
        jsonb_build_object('label', 'Meses recomendados: febrero, marzo, agosto y noviembre', 'response', 'SI', 'quantity', 4, 'observation', demo_note)
      )
    ),
    'accesibilidad', jsonb_build_object(
      'schemaVersion', 1,
      'response', 'SI',
      'observation', demo_note,
      'localityId', locality_id,
      'distanceKm', 0,
      'accessibilityDetails', jsonb_build_object(
        'roads', jsonb_build_array(
          jsonb_build_object(
            'roadTypeId', (SELECT id FROM tipos_via_terrestre WHERE codigo = 'PRIMER_ORDEN' AND activo),
            'typeLabel', 'Vía urbana pavimentada de primer orden',
            'startLatitude', -1.592100,
            'startLongitude', -79.000500,
            'endLatitude', -1.592630,
            'endLongitude', -79.000980,
            'distanceKm', 0.8,
            'materialId', road_material_id,
            'conditionId', (SELECT id FROM estados_condicion WHERE codigo = 'BUENO' AND activo),
            'observation', demo_note
          )
        ),
        'aquatic', jsonb_build_array(
          jsonb_build_object(
            'modalityId', NULL,
            'modalityLabel', 'No aplica: acceso acuático no disponible; campo referencial completado',
            'departure', 'No aplica',
            'departureConditionId', NULL,
            'arrival', 'No aplica',
            'arrivalConditionId', NULL,
            'observation', demo_note
          )
        ),
        'aerial', jsonb_build_array(
          jsonb_build_object(
            'coverageId', NULL,
            'coverageLabel', 'No aplica: acceso aéreo no disponible; campo referencial completado',
            'observation', demo_note
          )
        ),
        'transportTypes', jsonb_build_array(
          jsonb_build_object(
            'typeId', (SELECT id FROM tipos_transporte WHERE codigo = 'BUS' AND activo),
            'label', 'Bus interparroquial',
            'applies', TRUE,
            'detailOther', 'Servicio referencial con conexión al centro de Guaranda',
            'observation', demo_note
          ),
          jsonb_build_object(
            'typeId', (SELECT id FROM tipos_transporte WHERE codigo = 'TAXI' AND activo),
            'label', 'Taxi convencional',
            'applies', TRUE,
            'detailOther', 'Servicio referencial bajo coordinación local',
            'observation', demo_note
          )
        ),
        'transportDetails', jsonb_build_array(
          jsonb_build_object(
            'operator', 'Cooperativa de transporte Guaranda Demo',
            'terminal', 'Terminal terrestre de Guaranda (referencial)',
            'frequencyId', (SELECT id FROM frecuencias_servicio WHERE codigo = 'DIARIO' AND activo),
            'frequencyLabel', 'Diaria',
            'transferDetail', 'Traslado aproximado de diez minutos desde el terminal hasta el centro cultural',
            'observation', demo_note
          )
        ),
        'criteria', jsonb_build_array(
          jsonb_build_object(
            'accessibilityTypeId', (SELECT id FROM tipos_accesibilidad WHERE codigo = 'GENERAL' AND activo),
            'criterionId', (SELECT id FROM criterios_accesibilidad WHERE codigo = 'GENERAL_11' AND activo),
            'label', 'Recepción',
            'response', 'SI',
            'detail', 'Recepción referencial con orientación inicial al visitante',
            'observation', demo_note
          ),
          jsonb_build_object(
            'accessibilityTypeId', (SELECT id FROM tipos_accesibilidad WHERE codigo = 'GENERAL' AND activo),
            'criterionId', (SELECT id FROM criterios_accesibilidad WHERE codigo = 'GENERAL_06' AND activo),
            'label', 'Señalética informativa',
            'response', 'SI',
            'detail', 'Señalética referencial en el acceso principal',
            'observation', demo_note
          ),
          jsonb_build_object(
            'accessibilityTypeId', (SELECT id FROM tipos_accesibilidad WHERE codigo = 'FISICA' AND activo),
            'criterionId', (SELECT id FROM criterios_accesibilidad WHERE codigo = 'FISICA_01' AND activo),
            'label', 'Rampas externas de existir desnivel entre acera y acceso',
            'response', 'SI',
            'detail', 'Rampa referencial de acceso al espacio de recepción',
            'observation', demo_note
          )
        ),
        'signage', jsonb_build_object(
          'available', 'SI',
          'conditionId', (SELECT id FROM estados_condicion WHERE codigo = 'BUENO' AND activo),
          'observation', demo_note
        )
      ),
      'rows', jsonb_build_array(
        jsonb_build_object('label', 'Localidad cercana: Guaranda', 'response', 'SI', 'quantity', 1, 'observation', demo_note),
        jsonb_build_object('label', 'Vía terrestre pavimentada', 'response', 'SI', 'quantity', 1, 'observation', demo_note),
        jsonb_build_object('label', 'Transporte público y taxi', 'response', 'SI', 'quantity', 2, 'observation', demo_note),
        jsonb_build_object('label', 'Criterios de accesibilidad detallada', 'response', 'SI', 'quantity', 3, 'observation', demo_note),
        jsonb_build_object('label', 'Señalización de aproximación', 'response', 'SI', 'quantity', 1, 'observation', demo_note)
      )
    ),
    'planta', jsonb_build_object(
      'schemaVersion', 1,
      'response', 'SI',
      'observation', demo_note,
      'plant', jsonb_build_array(
        jsonb_build_object(
          'scope', 'EN_ATRACTIVO',
          'typeId', (SELECT id FROM tipos_planta_turistica WHERE codigo = 'ALIMENTOS_CAFETERIAS' AND activo),
          'typeLabel', 'Cafeterías',
          'group', 'Alimentos y bebidas',
          'quantity1', 1,
          'quantity2', 12,
          'quantity3', 24,
          'observation', demo_note
        ),
        jsonb_build_object(
          'scope', 'EN_POBLADO_CERCANO',
          'typeId', (SELECT id FROM tipos_planta_turistica WHERE codigo = 'ALIMENTOS_RESTAURANTES' AND activo),
          'typeLabel', 'Restaurantes',
          'group', 'Alimentos y bebidas',
          'quantity1', 4,
          'quantity2', 48,
          'quantity3', 120,
          'observation', demo_note
        ),
        jsonb_build_object(
          'scope', 'EN_ATRACTIVO',
          'typeId', (SELECT id FROM tipos_planta_turistica WHERE codigo = 'GUIA_LOCAL' AND activo),
          'typeLabel', 'Guías locales',
          'group', 'Operación turística',
          'quantity1', 2,
          'quantity2', 2,
          'quantity3', 2,
          'observation', demo_note
        )
      ),
      'facilitiesDetails', jsonb_build_array(
        jsonb_build_object(
          'categoryId', (SELECT categoria_facilidad_id FROM tipos_facilidad WHERE codigo = 'CENTRO_RECEPCION' AND activo),
          'typeId', (SELECT id FROM tipos_facilidad WHERE codigo = 'CENTRO_RECEPCION' AND activo),
          'typeLabel', 'Centro de recepción de visitantes',
          'quantity', 1,
          'latitude', -1.592630,
          'longitude', -79.000980,
          'administrator', 'Administración municipal de Guaranda',
          'universalAccessibility', 'SI',
          'conditionId', (SELECT id FROM estados_condicion WHERE codigo = 'BUENO' AND activo),
          'detailOther', 'Módulo de orientación y bienvenida referencial',
          'observation', demo_note
        ),
        jsonb_build_object(
          'categoryId', (SELECT categoria_facilidad_id FROM tipos_facilidad WHERE codigo = 'PUNTO_INFORMACION' AND activo),
          'typeId', (SELECT id FROM tipos_facilidad WHERE codigo = 'PUNTO_INFORMACION' AND activo),
          'typeLabel', 'Punto de Información',
          'quantity', 1,
          'latitude', -1.592610,
          'longitude', -79.000950,
          'administrator', 'Equipo de información turística demo',
          'universalAccessibility', 'SI',
          'conditionId', (SELECT id FROM estados_condicion WHERE codigo = 'BUENO' AND activo),
          'detailOther', 'Mesa de orientación con material impreso referencial',
          'observation', demo_note
        ),
        jsonb_build_object(
          'categoryId', (SELECT categoria_facilidad_id FROM tipos_facilidad WHERE codigo = 'BATERIA_SANITARIA' AND activo),
          'typeId', (SELECT id FROM tipos_facilidad WHERE codigo = 'BATERIA_SANITARIA' AND activo),
          'typeLabel', 'Baterías sanitarias',
          'quantity', 2,
          'latitude', -1.592670,
          'longitude', -79.001020,
          'administrator', 'Administración municipal de Guaranda',
          'universalAccessibility', 'SI',
          'conditionId', (SELECT id FROM estados_condicion WHERE codigo = 'BUENO' AND activo),
          'detailOther', 'Servicios sanitarios diferenciados y accesibles de referencia',
          'observation', demo_note
        ),
        jsonb_build_object(
          'categoryId', (SELECT categoria_facilidad_id FROM tipos_facilidad WHERE codigo = 'ESTACIONAMIENTO' AND activo),
          'typeId', (SELECT id FROM tipos_facilidad WHERE codigo = 'ESTACIONAMIENTO' AND activo),
          'typeLabel', 'Estacionamientos',
          'quantity', 8,
          'latitude', -1.592590,
          'longitude', -79.001050,
          'administrator', 'Administración municipal de Guaranda',
          'universalAccessibility', 'SI',
          'conditionId', (SELECT id FROM estados_condicion WHERE codigo = 'BUENO' AND activo),
          'detailOther', 'Plazas de estacionamiento de uso controlado referencial',
          'observation', demo_note
        )
      ),
      'complementaryServices', jsonb_build_array(
        jsonb_build_object(
          'scope', 'EN_ATRACTIVO',
          'typeId', (SELECT id FROM tipos_servicio_complementario WHERE codigo = 'VENTA_ARTESANIAS_MERCH' AND activo),
          'typeLabel', 'Venta de artesanías y merchandising',
          'specification', 'Muestra y venta de recuerdos culturales elaborados por artesanos locales',
          'observation', demo_note
        ),
        jsonb_build_object(
          'scope', 'EN_POBLADO_CERCANO',
          'typeId', (SELECT id FROM tipos_servicio_complementario WHERE codigo = 'OTRO' AND activo),
          'typeLabel', 'Otro servicio complementario',
          'specification', 'Orientación para recorridos culturales y agenda comunitaria referencial',
          'observation', demo_note
        )
      ),
      'rows', jsonb_build_array(
        jsonb_build_object('label', 'Planta turística en el atractivo', 'response', 'SI', 'quantity', 2, 'observation', demo_note),
        jsonb_build_object('label', 'Planta turística en la localidad cercana', 'response', 'SI', 'quantity', 4, 'observation', demo_note),
        jsonb_build_object('label', 'Facilidades del entorno', 'response', 'SI', 'quantity', 4, 'observation', demo_note),
        jsonb_build_object('label', 'Servicios complementarios', 'response', 'SI', 'quantity', 2, 'observation', demo_note)
      )
    ),
    'conservacion', jsonb_build_object(
      'schemaVersion', 1,
      'response', 'SI',
      'observation', demo_note,
      'conservation', jsonb_build_object(
        'attraction', jsonb_build_object('state', 'CONSERVADO', 'observation', 'Estado referencial del inmueble cultural; verificar mediante inspección técnica.'),
        'environment', jsonb_build_object('state', 'ALTERADO', 'observation', 'Entorno urbano referencial con intervención y tránsito cotidiano; validar en sitio.'),
        'factors', jsonb_build_array(
          jsonb_build_object(
            'component', 'ATRACTIVO',
            'factorId', (SELECT id FROM factores_alteracion WHERE codigo = 'NAT_HUMEDAD' AND activo),
            'origin', 'NATURAL',
            'name', 'Humedad',
            'response', 'SI',
            'detailOther', 'Humedad ambiental referencial en temporada de lluvias',
            'observation', demo_note
          ),
          jsonb_build_object(
            'component', 'ENTORNO',
            'factorId', (SELECT id FROM factores_alteracion WHERE codigo = 'NAT_CLIMA' AND activo),
            'origin', 'NATURAL',
            'name', 'Clima',
            'response', 'SI',
            'detailOther', 'Variaciones de lluvia y temperatura propias del entorno andino',
            'observation', demo_note
          ),
          jsonb_build_object(
            'component', 'ENTORNO',
            'factorId', (SELECT id FROM factores_alteracion WHERE codigo = 'ANT_NEGLIGENCIA_ABANDONO' AND activo),
            'origin', 'ANTROPICO',
            'name', 'Negligencia / abandono',
            'response', 'NO',
            'detailOther', 'No identificado en este registro demo',
            'observation', demo_note
          )
        )
      ),
      'declarations', jsonb_build_array(
        jsonb_build_object(
          'entity', 'Gobierno Autónomo Descentralizado Municipal de Guaranda',
          'denomination', 'Espacio cultural de interés municipal (referencial demo)',
          'date', '2024-08-10',
          'scope', 'Municipal',
          'observation', demo_note
        )
      ),
      'rows', jsonb_build_array(
        jsonb_build_object('label', 'Estado del atractivo: Conservado', 'response', 'SI', 'quantity', 1, 'observation', demo_note),
        jsonb_build_object('label', 'Estado del entorno: Alterado', 'response', 'SI', 'quantity', 1, 'observation', demo_note),
        jsonb_build_object('label', 'Factores naturales y antrópicos', 'response', 'SI', 'quantity', 3, 'observation', demo_note),
        jsonb_build_object('label', 'Declaratoria referencial', 'response', 'SI', 'quantity', 1, 'observation', demo_note)
      )
    ),
    'higiene-seguridad', jsonb_build_object(
      'schemaVersion', 1,
      'response', 'SI',
      'observation', demo_note,
      'hygieneSafety', jsonb_build_object(
        'entries', jsonb_build_array(
          jsonb_build_object(
            'kind', 'BASIC_SERVICE',
            'scope', 'EN_ATRACTIVO',
            'typeId', (SELECT id FROM tipos_servicio_basico WHERE codigo = 'AGUA_POTABLE' AND activo),
            'name', 'Agua potable',
            'provider', 'Empresa pública de agua demo',
            'secondaryId', NULL,
            'secondary', 'Conexión a red pública referencial',
            'response', 'SI',
            'quantity', 1,
            'condition', 'BUENO',
            'observation', demo_note
          ),
          jsonb_build_object(
            'kind', 'SIGNAGE',
            'scope', 'EN_ATRACTIVO',
            'typeId', (SELECT id FROM tipos_senaletica WHERE codigo = 'URBANA_02' AND activo),
            'name', 'Pictograma de atractivos culturales',
            'provider', 'Administración municipal de Guaranda',
            'secondaryId', (SELECT id FROM materiales_senaletica WHERE codigo = 'MADERA' AND activo),
            'secondary', 'Material de madera tratada referencial',
            'response', 'SI',
            'quantity', 4,
            'condition', 'BUENO',
            'observation', demo_note
          ),
          jsonb_build_object(
            'kind', 'HEALTH',
            'scope', 'EN_ATRACTIVO',
            'typeId', (SELECT id FROM tipos_servicio_salud WHERE codigo = 'BOTIQUIN_PRIMEROS_AUXILIOS' AND activo),
            'name', 'Botiquín de primeros auxilios',
            'provider', 'Administración del centro cultural demo',
            'secondaryId', NULL,
            'secondary', 'Kit básico de atención inicial referencial',
            'response', 'SI',
            'quantity', 1,
            'condition', 'BUENO',
            'observation', demo_note
          ),
          jsonb_build_object(
            'kind', 'SECURITY',
            'scope', 'EN_ATRACTIVO',
            'typeId', (SELECT id FROM tipos_servicio_seguridad WHERE codigo = 'POLICIA_MUNICIPAL' AND activo),
            'name', 'Policía metropolitana / Municipal',
            'provider', 'Unidad municipal de seguridad demo',
            'secondaryId', NULL,
            'secondary', 'Patrullaje de apoyo referencial',
            'response', 'SI',
            'quantity', 1,
            'condition', 'BUENO',
            'observation', demo_note
          ),
          jsonb_build_object(
            'kind', 'COMMUNICATION',
            'scope', 'EN_ATRACTIVO',
            'typeId', (SELECT id FROM tipos_comunicacion WHERE codigo = 'INTERNET_REDES_INALAMBRICAS' AND activo),
            'name', 'Redes inalámbricas',
            'provider', 'Proveedor local de conectividad demo',
            'secondaryId', NULL,
            'secondary', 'Cobertura interna referencial',
            'response', 'SI',
            'quantity', 1,
            'condition', 'BUENO',
            'observation', demo_note
          ),
          jsonb_build_object(
            'kind', 'THREAT',
            'scope', 'EN_ATRACTIVO',
            'typeId', (SELECT id FROM tipos_amenaza WHERE codigo = 'AMENAZA_SISMOS' AND activo),
            'name', 'Sismos',
            'provider', 'Matriz de riesgos demo',
            'secondaryId', NULL,
            'secondary', 'Amenaza territorial referencial',
            'response', 'SI',
            'quantity', 1,
            'condition', 'REGULAR',
            'observation', demo_note
          )
        ),
        'radios', jsonb_build_object(
          'available', 'SI',
          'visitorUse', 'SI',
          'internalUse', 'SI',
          'emergencyUse', 'SI',
          'quantity', 2,
          'observation', demo_note
        ),
        'contingency', jsonb_build_object(
          'exists', 'SI',
          'institution', 'Administración municipal de Guaranda',
          'document', 'Plan de contingencia cultural 2026 (referencial demo)',
          'year', 2026,
          'observation', demo_note
        )
      ),
      'rows', jsonb_build_array(
        jsonb_build_object('label', 'Servicios básicos', 'response', 'SI', 'quantity', 1, 'observation', demo_note),
        jsonb_build_object('label', 'Señalética', 'response', 'SI', 'quantity', 4, 'observation', demo_note),
        jsonb_build_object('label', 'Servicios de salud', 'response', 'SI', 'quantity', 1, 'observation', demo_note),
        jsonb_build_object('label', 'Servicios de seguridad', 'response', 'SI', 'quantity', 1, 'observation', demo_note),
        jsonb_build_object('label', 'Comunicación y radios', 'response', 'SI', 'quantity', 3, 'observation', demo_note),
        jsonb_build_object('label', 'Amenazas y plan de contingencia', 'response', 'SI', 'quantity', 2, 'observation', demo_note)
      )
    ),
    'politicas', jsonb_build_object(
      'schemaVersion', 1,
      'response', 'SI',
      'observation', demo_note,
      'policies', jsonb_build_array(
        jsonb_build_object('code', 'PLAN_DESARROLLO_GAD', 'question', '¿El atractivo se encuentra dentro del plan de desarrollo turístico del GAD?', 'response', 'SI', 'year', 2026, 'specification', 'Incluido de forma referencial en la agenda cultural municipal demo.', 'observation', demo_note),
        jsonb_build_object('code', 'PLANIFICACION_TERRITORIAL', 'question', '¿El atractivo se encuentra dentro de la planificación turística territorial?', 'response', 'SI', 'year', 2026, 'specification', 'Considerado como equipamiento cultural urbano referencial.', 'observation', demo_note),
        jsonb_build_object('code', 'REGULACIONES_APLICABLES', 'question', '¿Existen normativas que se apliquen para desarrollar la actividad turística?', 'response', 'SI', 'year', 2026, 'specification', 'Aplicación referencial de normas de uso, seguridad y conservación.', 'observation', demo_note),
        jsonb_build_object('code', 'ORDENANZAS_APLICABLES', 'question', '¿Existen ordenanzas que se apliquen para desarrollar la actividad turística?', 'response', 'SI', 'year', 2026, 'specification', 'Ordenanza municipal referencial pendiente de validación documental.', 'observation', demo_note)
      ),
      'rows', jsonb_build_array(
        jsonb_build_object('label', 'Plan de desarrollo del GAD', 'response', 'SI', 'quantity', 1, 'observation', demo_note),
        jsonb_build_object('label', 'Planificación territorial', 'response', 'SI', 'quantity', 1, 'observation', demo_note),
        jsonb_build_object('label', 'Regulaciones aplicables', 'response', 'SI', 'quantity', 1, 'observation', demo_note),
        jsonb_build_object('label', 'Ordenanzas aplicables', 'response', 'SI', 'quantity', 1, 'observation', demo_note)
      )
    ),
    'actividades', jsonb_build_object(
      'schemaVersion', 1,
      'response', 'SI',
      'observation', demo_note,
      'rows', jsonb_build_array(
        jsonb_build_object('label', 'Compra de artesanías', 'response', 'SI', 'quantity', 1, 'observation', demo_note),
        jsonb_build_object('label', 'Degustación de platos tradicionales', 'response', 'SI', 'quantity', 1, 'observation', demo_note),
        jsonb_build_object('label', 'Muestras audiovisuales', 'response', 'SI', 'quantity', 1, 'observation', demo_note),
        jsonb_build_object('label', 'Presentaciones o representaciones en vivo', 'response', 'SI', 'quantity', 2, 'observation', demo_note),
        jsonb_build_object('label', 'Exhibición de piezas y obras originales', 'response', 'SI', 'quantity', 1, 'observation', demo_note),
        jsonb_build_object('label', 'Exposiciones temáticas', 'response', 'SI', 'quantity', 2, 'observation', demo_note),
        jsonb_build_object('label', 'Recorrido autoguiado', 'response', 'SI', 'quantity', 1, 'observation', demo_note)
      )
    ),
    'promocion', jsonb_build_object(
      'schemaVersion', 1,
      'response', 'SI',
      'observation', demo_note,
      'promotion', jsonb_build_object(
        'hasPlan', 'SI',
        'planName', 'Agenda cultural y turística de Guaranda 2026 (referencial demo)',
        'includedInPlan', 'SI',
        'partOfPackage', 'SI',
        'packageDetail', 'Paquete cultural urbano de medio día con recorrido, exposición y degustación referenciales.',
        'observation', demo_note,
        'media', jsonb_build_array(
          jsonb_build_object('response', 'SI', 'typeId', (SELECT id FROM tipos_medio_promocion WHERE codigo = 'PAGINA_WEB' AND activo), 'name', 'Portal turístico municipal demo', 'url', 'https://demo.turismo.example/centro-cultural-indio-guaranga', 'periodicity', 'Actualización mensual', 'detailOther', 'Página web de demostración', 'observation', demo_note),
          jsonb_build_object('response', 'SI', 'typeId', (SELECT id FROM tipos_medio_promocion WHERE codigo = 'RED_SOCIAL' AND activo), 'name', 'Canales sociales institucionales demo', 'url', 'https://social.example/centro-cultural-indio-guaranga', 'periodicity', 'Publicación semanal', 'detailOther', 'Contenido social de demostración', 'observation', demo_note),
          jsonb_build_object('response', 'SI', 'typeId', (SELECT id FROM tipos_medio_promocion WHERE codigo = 'OFICINA_INFORMACION_TURISTICA' AND activo), 'name', 'Oficina de información turística demo', 'url', 'https://info.example/guaranda', 'periodicity', 'Atención diaria', 'detailOther', 'Orientación presencial referencial', 'observation', demo_note)
        )
      ),
      'rows', jsonb_build_array(
        jsonb_build_object('label', 'Plan de promoción institucional', 'response', 'SI', 'quantity', 1, 'observation', demo_note),
        jsonb_build_object('label', 'Inclusión en agenda turística', 'response', 'SI', 'quantity', 1, 'observation', demo_note),
        jsonb_build_object('label', 'Paquete cultural de medio día', 'response', 'SI', 'quantity', 1, 'observation', demo_note),
        jsonb_build_object('label', 'Medios de promoción', 'response', 'SI', 'quantity', 3, 'observation', demo_note)
      )
    ),
    'visitantes', jsonb_build_object(
      'schemaVersion', 1,
      'response', 'SI',
      'observation', demo_note,
      'visitors', jsonb_build_object(
        'registry', jsonb_build_object(
          'exists', 'SI',
          'type', 'DIGITAL',
          'years', 3,
          'reports', 'SI',
          'frequency', 'Mensual',
          'observation', demo_note
        ),
        'seasons', jsonb_build_array(
          jsonb_build_object('type', 'ALTA', 'quantity', 1200, 'year', 2025, 'months', jsonb_build_array(2, 3, 8, 11), 'observation', demo_note),
          jsonb_build_object('type', 'BAJA', 'quantity', 450, 'year', 2025, 'months', jsonb_build_array(1, 4, 5, 6, 7, 9, 10, 12), 'observation', demo_note)
        ),
        'origins', jsonb_build_array(
          jsonb_build_object('type', 'NACIONAL', 'place', 'Quito', 'month', 8, 'year', 2025, 'quantity', 360, 'observation', demo_note),
          jsonb_build_object('type', 'NACIONAL', 'place', 'Ambato', 'month', 3, 'year', 2025, 'quantity', 220, 'observation', demo_note),
          jsonb_build_object('type', 'EXTRANJERA', 'place', 'Colombia', 'month', 11, 'year', 2025, 'quantity', 80, 'observation', demo_note)
        ),
        'informants', jsonb_build_array(
          jsonb_build_object('name', 'Coordinación cultural municipal demo', 'contact', '032987654 / informante.demo@example.com', 'observation', demo_note),
          jsonb_build_object('name', 'Asociación de artesanos de Guaranda demo', 'contact', '0990000000 / artesanos.demo@example.com', 'observation', demo_note)
        ),
        'influx', jsonb_build_object('weekday', 18, 'weekend', 55, 'holidays', 120, 'frequency', 'ESTACIONAL', 'observation', demo_note)
      ),
      'rows', jsonb_build_array(
        jsonb_build_object('label', 'Registro digital de visitantes', 'response', 'SI', 'quantity', 3, 'observation', demo_note),
        jsonb_build_object('label', 'Temporada alta', 'response', 'SI', 'quantity', 1200, 'observation', demo_note),
        jsonb_build_object('label', 'Procedencias nacionales y extranjeras', 'response', 'SI', 'quantity', 3, 'observation', demo_note),
        jsonb_build_object('label', 'Informantes clave', 'response', 'SI', 'quantity', 2, 'observation', demo_note),
        jsonb_build_object('label', 'Afluencia semanal y feriados', 'response', 'SI', 'quantity', 193, 'observation', demo_note)
      )
    ),
    'recurso-humano', jsonb_build_object(
      'schemaVersion', 1,
      'response', 'SI',
      'observation', demo_note,
      'humanResources', jsonb_build_object(
        'summary', jsonb_build_object('administrationOperation', 4, 'specializedTourism', 2, 'observation', demo_note),
        'training', jsonb_build_array(
          jsonb_build_object('group', 'EDUCACION', 'typeId', (SELECT id FROM tipos_formacion_personal WHERE codigo = 'EDUCACION_TERCER_NIVEL' AND activo), 'name', 'Tercer Nivel', 'quantity', 2, 'detailOther', 'Gestión cultural y turismo patrimonial referencial', 'observation', demo_note),
          jsonb_build_object('group', 'CAPACITACION', 'typeId', (SELECT id FROM tipos_formacion_personal WHERE codigo = 'CAPACITACION_PRIMEROS_AUXILIOS' AND activo), 'name', 'Primeros Auxilios', 'quantity', 3, 'detailOther', 'Taller anual de respuesta inicial referencial', 'observation', demo_note),
          jsonb_build_object('group', 'IDIOMA', 'typeId', (SELECT id FROM tipos_formacion_personal WHERE codigo = 'IDIOMA_INGLES' AND activo), 'name', 'Inglés', 'quantity', 1, 'detailOther', 'Nivel conversacional referencial', 'observation', demo_note)
        )
      ),
      'rows', jsonb_build_array(
        jsonb_build_object('label', 'Personal de administración y operación', 'response', 'SI', 'quantity', 4, 'observation', demo_note),
        jsonb_build_object('label', 'Personal especializado en turismo', 'response', 'SI', 'quantity', 2, 'observation', demo_note),
        jsonb_build_object('label', 'Educación y capacitación', 'response', 'SI', 'quantity', 5, 'observation', demo_note),
        jsonb_build_object('label', 'Idiomas', 'response', 'SI', 'quantity', 1, 'observation', demo_note)
      )
    ),
    'descripcion', jsonb_build_object(
      'schemaVersion', 1,
      'response', 'SI',
      'observation', demo_note,
      'rows', jsonb_build_array(
        jsonb_build_object('label', 'Descripción narrativa', 'response', 'SI', 'quantity', 1, 'observation', demo_description),
        jsonb_build_object('label', 'Experiencia cultural', 'response', 'SI', 'quantity', 1, 'observation', 'Recorrido referencial por memoria local, expresiones artísticas y actividades comunitarias.'),
        jsonb_build_object('label', 'Público objetivo', 'response', 'SI', 'quantity', 3, 'observation', 'Familias, estudiantes y visitantes interesados en cultura; clasificación inventada para demo.')
      )
    ),
    'anexos', jsonb_build_object(
      'schemaVersion', 1,
      'response', 'SI',
      'observation', demo_note,
      'annexes', jsonb_build_object(
        'documents', jsonb_build_array(),
        'responsibles', jsonb_build_array(
          jsonb_build_object('typeId', (SELECT id FROM tipos_responsabilidad_ficha WHERE codigo = 'ELABORO'), 'name', 'Equipo de captura turística demo', 'role', 'Elaboró la ficha de demostración', 'institution', 'Unidad de Turismo y Cultura Demo', 'phone', '032900000', 'email', 'captura.demo@example.com', 'observation', demo_note),
          jsonb_build_object('typeId', (SELECT id FROM tipos_responsabilidad_ficha WHERE codigo = 'VALIDO'), 'name', 'Revisor institucional demo', 'role', 'Revisión referencial pendiente', 'institution', 'Gobierno Autónomo Descentralizado Municipal de Guaranda', 'phone', '032900001', 'email', 'revision.demo@example.com', 'observation', demo_note)
        ),
        'accessibilitySurvey', jsonb_build_object('date', '2026-09-20', 'responsible', 'Equipo técnico de accesibilidad demo', 'scope', 'Recorrido de acceso principal y servicios internos', 'observation', demo_note),
        'gadValidation', jsonb_build_object('acceptance', 'SI', 'name', 'Validador municipal demo', 'institution', 'Gobierno Autónomo Descentralizado Municipal de Guaranda', 'position', 'Técnico de turismo (referencial)', 'phone', '032900002', 'email', 'gad.demo@example.com', 'date', '2026-09-21', 'observation', 'Aceptación ficticia para prueba de interfaz; no constituye validación oficial.')
      ),
      'rows', jsonb_build_array(
        jsonb_build_object('label', 'Responsables de elaboración y revisión', 'response', 'SI', 'quantity', 2, 'observation', demo_note),
        jsonb_build_object('label', 'Levantamiento de accesibilidad', 'response', 'SI', 'quantity', 1, 'observation', demo_note),
        jsonb_build_object('label', 'Validación del GAD', 'response', 'SI', 'quantity', 1, 'observation', 'Registro ficticio para demo; no reemplaza firma institucional.'),
        jsonb_build_object('label', 'Documentos institucionales', 'response', 'SIN_INFORMACION', 'quantity', 0, 'observation', 'No se crea un archivo binario falso; adjuntar documentos reales durante la validación.')
      )
    )
  );

  new_data := (old_data - 'sections') || jsonb_build_object(
    'name', center_name,
    'description', demo_description,
    'address', jsonb_build_object(
      'barrio', 'Centro de Guaranda',
      'street', 'Calle Convención',
      'number', 'S/N',
      'crossStreet', 'Calle Sucre'
    ),
    'latitude', -1.592630,
    'longitude', -79.000980,
    'altitudeMeters', 2668,
    'administration', jsonb_build_object(
      'type', 'GAD_MUNICIPAL',
      'institution', 'Gobierno Autónomo Descentralizado Municipal de Guaranda',
      'name', 'Administración municipal de Guaranda',
      'position', 'Gestión cultural y turística',
      'phone', '032987654',
      'email', 'centro.cultural.demo@example.com',
      'observation', demo_note
    ),
    'climate', jsonb_build_object(
      'climateId', climate_id,
      'minTemperature', 10.5,
      'maxTemperature', 19.5,
      'minRainfall', 500,
      'maxRainfall', 950
    ),
    'admission', jsonb_build_object(
      'incomeTypeId', 1,
      'attentionModeId', 1,
      'opensAt', '08:00',
      'closesAt', '18:00',
      'otherAttention', 'Atención guiada y reservas referenciales previa coordinación.',
      'reservations', TRUE,
      'priceFrom', 1.50,
      'priceTo', 3.00,
      'observation', demo_note
    ),
    'activities', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'active', TRUE,
          'activityId', a.id,
          'detailOther', 'Actividad cultural de demostración programada de manera referencial.',
          'observation', demo_note
        )
        ORDER BY a.id
      )
      FROM actividades_turisticas a
      WHERE a.activo
        AND a.codigo IN (
          'ARTESANIAS',
          'DEGUSTACION',
          'CULTURA_MUESTRAS_AUDIOVISUALES',
          'CULTURA_PRESENTACIONES_O_REPRESENTACIONES_EN_VIVO',
          'CULTURA_08',
          'CULTURA_07',
          'CULTURA_RECORRIDO_AUTOGUIADOS'
        )
    ),
    'accessibility', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'typeId', a.id,
          'applies', TRUE,
          'observation', demo_note
        )
        ORDER BY a.id
      )
      FROM tipos_accesibilidad a
      WHERE a.activo
        AND a.codigo IN ('GENERAL', 'FISICA', 'VISUAL')
    ),
    'facilities', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'typeId', f.id,
          'quantity', 1,
          'detailOther', 'Facilidad de demostración con disponibilidad referencial.',
          'observation', demo_note
        )
        ORDER BY f.id
      )
      FROM tipos_facilidad f
      WHERE f.activo
        AND f.codigo IN ('CENTRO_RECEPCION', 'PUNTO_INFORMACION', 'BATERIA_SANITARIA', 'ESTACIONAMIENTO')
    ),
    'sections', demo_sections
  );

  UPDATE borradores_centros_turisticos
  SET datos = new_data,
      version = version + 1,
      actualizado_por = actor_id,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = draft_id;

  INSERT INTO auditoria_fichas (
    centro_turistico_id,
    usuario_id,
    accion,
    seccion_codigo,
    datos_anteriores,
    datos_nuevos
  )
  VALUES (
    center_id,
    actor_id,
    'MODIFICAR',
    NULL,
    old_data,
    new_data
  );

  RAISE NOTICE 'Borrador demo completado: centro %, código %, versión % -> %',
    center_id, center_code, draft_version, draft_version + 1;
END $$;

