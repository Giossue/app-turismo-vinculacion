-- Catastro demostrativo derivado del consolidado nacional institucional.
-- Fuente: temp/Consolidado-Nacional-2026-publico-8 (1).xlsx
-- SHA-256: 3e5598c95edb2b4dc31ce0f776742e0bea59c146a2d9cb7087e0c47b53374e7d
-- Muestra operativa: cinco cabeceras, diez registros RATIFICADO por cabecera.
-- Las coordenadas de localidad son aproximadas; la fuente no trae coordenadas por establecimiento.

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';

-- Este seed se ejecuta antes de 20260921_establishment_coordinates_required.sql
-- por orden lexicográfico. Mantenerlo autocontenido permite arrancar desde una
-- base existente sin depender de que la migración posterior ya haya corrido.
ALTER TABLE establecimientos_turisticos
  ADD COLUMN IF NOT EXISTS coordenadas_aproximadas BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TEMP TABLE _catastro_demo_seed (
  provincia_codigo CHAR(2) NOT NULL,
  canton_codigo CHAR(2) NOT NULL,
  localidad_nombre VARCHAR(150) NOT NULL,
  numero_registro VARCHAR(40) PRIMARY KEY,
  ruc VARCHAR(13),
  nombre_comercial VARCHAR(180) NOT NULL,
  razon_social VARCHAR(200),
  actividad VARCHAR(180) NOT NULL,
  clasificacion VARCHAR(120),
  categoria VARCHAR(120)
) ON COMMIT DROP;

INSERT INTO _catastro_demo_seed (
  provincia_codigo, canton_codigo, localidad_nombre, numero_registro, ruc,
  nombre_comercial, razon_social, actividad, clasificacion, categoria
)
VALUES
  ('02', '01', 'Guaranda', '0102123593001.001.2001351', '0102123593001', 'BALCON CUENCANO', 'ARMIJOS ARMIJOS ROSA ESTHER', 'ALOJAMIENTO', 'HOSTAL', '1 Estrella'),
  ('02', '01', 'Guaranda', '0200077741001.002.3005453', '0200077741001', 'BARRIO CALIENTE', 'JIMENEZ GUERRERO BLANCA GRIMANEZA', 'ALIMENTOS, BEBIDAS Y ENTRETENIMIENTO', 'RESTAURANTE', '(1) Un tenedor'),
  ('02', '01', 'Guaranda', '0200092252001.001.5000988', '0200092252001', 'CAFE GALERIA 7 SANTOS', 'LARREA CALERO INES CECILIA', 'ALIMENTOS, BEBIDAS Y ENTRETENIMIENTO', 'CAFETERÍA', '(1) Una taza'),
  ('02', '01', 'Guaranda', '0200237238001.001.3001417', '0200237238001', 'SU SANTA FE', 'AYALA MONTENEGRO CRUZ ROBERTINA', 'ALIMENTOS, BEBIDAS Y ENTRETENIMIENTO', 'RESTAURANTE', '(1) Un tenedor'),
  ('02', '01', 'Guaranda', '0200440527001.001.2001572', '0200440527001', 'HOTEL MARQUEZ', 'ROMERO VARGAS LUIS ENRIQUE', 'ALOJAMIENTO', 'HOTEL', '2 Estrellas'),
  ('02', '01', 'Guaranda', '0200440527001.002.2001592', '0200440527001', 'HOTEL SAN LUIS', 'ROMERO VARGAS LUIS ENRIQUE', 'ALOJAMIENTO', 'HOTEL', '2 Estrellas'),
  ('02', '01', 'Guaranda', '0200480192001.002.2000543', '0200480192001', 'HOTEL SAN RAFAEL', 'LOPEZ GAVILANEZ CELIA TERESA', 'ALOJAMIENTO', 'HOTEL', '2 Estrellas'),
  ('02', '01', 'Guaranda', '0200717619001.001.2000049', '0200717619001', 'LA RUSTICA', 'VINUEZA GAVILANEZ ROSA MARGARITA', 'ALOJAMIENTO', 'HOTEL', '2 Estrellas'),
  ('02', '01', 'Guaranda', '0200879930001.001.7003045', '0200879930001', 'LISTO EL POLLO', 'SANCHEZ REAL MARIA ANA', 'ALIMENTOS, BEBIDAS Y ENTRETENIMIENTO', 'RESTAURANTE', '(1) Un tenedor'),
  ('02', '01', 'Guaranda', '0200932903001.001.7010818', '0200932903001', 'HOSTERIA EL ANGEL', 'VACA ROLDAN SILVANA MAGALY', 'ALOJAMIENTO', 'HOTEL', '2 Estrellas'),
  ('06', '01', 'Riobamba', '0105220446001.001.3014644', '0105220446001', 'EL CUSTODIO', 'FLORES SEGARRA MATIAS ALEJANDRO', 'ALIMENTOS, BEBIDAS Y ENTRETENIMIENTO', 'RESTAURANTE', '(1) Un tenedor'),
  ('06', '01', 'Riobamba', '0200164036001.001.1000310', '0200164036001', 'LOCAL DE RECEPCIONES MAJESTIC PALACE', 'ORTEGA VELASCO JOSE JOAQUIN', 'ORGANIZADORES DE EVENTOS, CONGRESOS Y CONVENCIONES', 'SALA DE RECEPCIONES Y BANQUETES', 'Categoría Uno'),
  ('06', '01', 'Riobamba', '0200330868001.002.1000311', '0200330868001', 'RINCON DE VERSALLES', 'ENDARA PICON LUIS EFRAIN', 'ORGANIZADORES DE EVENTOS, CONGRESOS Y CONVENCIONES', 'SALA DE RECEPCIONES Y BANQUETES', 'Categoría Uno'),
  ('06', '01', 'Riobamba', '0200426443001.001.3004043', '0200426443001', 'RESTAURANTE LA MOCCA, Y.', 'MIÑO HERRERA FANNY AMERICA', 'ALIMENTOS, BEBIDAS Y ENTRETENIMIENTO', 'RESTAURANTE', '(1) Un tenedor'),
  ('06', '01', 'Riobamba', '0200656528001.001.3017134', '0200656528001', 'PRINFRESA', 'ALMENDARIZ QUINTANA LIBIA CRISTINA', 'ALIMENTOS, BEBIDAS Y ENTRETENIMIENTO', 'CAFETERÍA', '(1) Una taza'),
  ('06', '01', 'Riobamba', '0201576519001.007.3015443', '0201576519001', 'BRISA DE FUEGO', 'VILLENA VILLENA MARIA LORENA', 'ALIMENTOS, BEBIDAS Y ENTRETENIMIENTO', 'RESTAURANTE', '(1) Un tenedor'),
  ('06', '01', 'Riobamba', '0202051710001.001.10000159', '0202051710001', 'ARMIJOS SALAZAR MARIUXI NATIVIDAD', 'ARMIJOS SALAZAR MARIUXI NATIVIDAD', 'GUIANZA TURÍSTICA', 'GUÍA DE TURISMO NACIONAL', 'Categoría Única'),
  ('06', '01', 'Riobamba', '0202187548001.003.3011759', '0202187548001', 'ATIPICO', 'VELASCO QUINTANA KAROLINA JASMIN', 'ALIMENTOS, BEBIDAS Y ENTRETENIMIENTO', 'DISCOTECA', '(1) Una copa'),
  ('06', '01', 'Riobamba', '0302200910001.002.10000030', '0302200910001', 'GUALLPA GUALLPA PAUL RENATO', 'GUALLPA GUALLPA PAUL RENATO', 'GUIANZA TURÍSTICA', 'GUÍA DE TURISMO NACIONAL', 'Categoría Única'),
  ('06', '01', 'Riobamba', '0501176101001.001.3004509', '0501176101001', 'MARISQUERIA DELICIAS DEL MAR', 'ESPINOZA VILLACRES MARTHA IRMA', 'ALIMENTOS, BEBIDAS Y ENTRETENIMIENTO', 'RESTAURANTE', '(1) Un tenedor'),
  ('18', '01', 'Ambato', '0101766327001.004.3015453', '0101766327001', 'RESTAURANTE CHOLA CUENCANA', 'ILLESCAS MOGROVEJO MARIA SALOME', 'ALIMENTOS, BEBIDAS Y ENTRETENIMIENTO', 'RESTAURANTE', '(1) Un tenedor'),
  ('18', '01', 'Ambato', '0101792844001.002.2000177', '0101792844001', 'ROKA PLAZA HOTEL BOUTIQUE', 'ANDRADE VALDIVIESO MARIA LORENA', 'ALOJAMIENTO', 'HOTEL', '2 Estrellas'),
  ('18', '01', 'Ambato', '0190169839001.008.3003922', '0190169839001', 'TUTTO FREDDO-YOGUBERRY', 'TUTTO FREDDO S.A', 'ALIMENTOS, BEBIDAS Y ENTRETENIMIENTO', 'CAFETERÍA', '(1) Una taza'),
  ('18', '01', 'Ambato', '0190169839001.010.3003919', '0190169839001', 'TUTTO FREDDO', 'TUTTO FREDDO S.A', 'ALIMENTOS, BEBIDAS Y ENTRETENIMIENTO', 'CAFETERÍA', '(1) Una taza'),
  ('18', '01', 'Ambato', '0190169839001.033.3005177', '0190169839001', 'NICE CREAM', 'TUTTO FREDDO S.A', 'ALIMENTOS, BEBIDAS Y ENTRETENIMIENTO', 'CAFETERÍA', '(1) Una taza'),
  ('18', '01', 'Ambato', '0190169839001.046.3012654', '0190169839001', 'TUTTO FREDDO', 'TUTTO FREDDO S.A', 'ALIMENTOS, BEBIDAS Y ENTRETENIMIENTO', 'CAFETERÍA', '(1) Una taza'),
  ('18', '01', 'Ambato', '0201189875001.002.2013165', '0201189875001', 'HOSTAL ESTRELLA', 'UCHUBANDA BAYAS ANA MARIA', 'ALOJAMIENTO', 'HOSTAL', '1 Estrella'),
  ('18', '01', 'Ambato', '0201812781001.001.3014649', '0201812781001', 'ECLIPSIA', 'POVEDA ORTIZ KARINA DANIELA', 'ALIMENTOS, BEBIDAS Y ENTRETENIMIENTO', 'RESTAURANTE', '(1) Un tenedor'),
  ('18', '01', 'Ambato', '0202046892001.001.10000220', '0202046892001', 'CHAMORRO SALAZAR PABLO ROBERTO', 'CHAMORRO SALAZAR PABLO ROBERTO', 'GUIANZA TURÍSTICA', 'GUÍA DE TURISMO NACIONAL', 'Categoría Única'),
  ('18', '01', 'Ambato', '0202089991001.001.3005398', '0202089991001', 'ASADERO LAS CAÑAS', 'LARA GAGLAY DANIEL ALEXANDER', 'ALIMENTOS, BEBIDAS Y ENTRETENIMIENTO', 'RESTAURANTE', '(1) Un tenedor'),
  ('05', '01', 'Latacunga', '0103653820001.001.1013785', '0103653820001', 'BLACK DIAMOND', 'BERMEO LLERENA JUAN CARLOS', 'ORGANIZADORES DE EVENTOS, CONGRESOS Y CONVENCIONES', 'SALA DE RECEPCIONES Y BANQUETES', 'Categoría Dos'),
  ('05', '01', 'Latacunga', '0104752084001.002.3012168', '0104752084001', 'TUTTO FREDDO', 'ALVAREZ JIMENEZ ANGEL AVILIO', 'ALIMENTOS, BEBIDAS Y ENTRETENIMIENTO', 'CAFETERÍA', '(2) Dos tazas'),
  ('05', '01', 'Latacunga', '0500003363001.005.2011192', '0500003363001', 'GRAN HOTEL REX', 'BERRAZUETA ANDRADE ANGEL CALIXTO', 'ALOJAMIENTO', 'HOTEL', '2 Estrellas'),
  ('05', '01', 'Latacunga', '0500080866001.001.7008437', '0500080866001', 'DELICATESEN LA FINCA', 'GUTIERREZ ESTRADA FANNY ANGELICA', 'ALIMENTOS, BEBIDAS Y ENTRETENIMIENTO', 'RESTAURANTE', '(1) Un tenedor'),
  ('05', '01', 'Latacunga', '0500087978001.002.3005054', '0500087978001', 'BAR LA COCHA', 'BANDA SALAZAR MANUELA', 'ALIMENTOS, BEBIDAS Y ENTRETENIMIENTO', 'BAR', '(1) Una copa'),
  ('05', '01', 'Latacunga', '0500129986001.002.7003914', '0500129986001', 'GRAN JULIO SAMPEDRO', 'TOAPANTA AQUINO MARIA AGUSTINA', 'ALOJAMIENTO', 'HOTEL', '2 Estrellas'),
  ('05', '01', 'Latacunga', '0500182183001.003.2001056', '0500182183001', 'RITZOR', 'TELLO JACOME JOSE ANIBAL', 'ALOJAMIENTO', 'HOTEL', '2 Estrellas'),
  ('05', '01', 'Latacunga', '0500626668001.001.3000635', '0500626668001', 'RESTAURANTE POLLOS JIMMYS', 'ALVAREZ MARTHA CECILIA', 'ALIMENTOS, BEBIDAS Y ENTRETENIMIENTO', 'RESTAURANTE', '(1) Un tenedor'),
  ('05', '01', 'Latacunga', '0500741087001.001.3012400', '0500741087001', 'D''TERE CON SABOR A HOGAR', 'TOSCANO TERESA DE JESUS', 'ALIMENTOS, BEBIDAS Y ENTRETENIMIENTO', 'CAFETERÍA', '(1) Una taza'),
  ('05', '01', 'Latacunga', '0501044606001.002.2000835', '0501044606001', 'HOTEL SAN LUIS', 'AVILA ZAPATA TERESA DE JESUS', 'ALOJAMIENTO', 'HOTEL', '2 Estrellas'),
  ('12', '01', 'Babahoyo', '0201064375001.001.7001671', '0201064375001', 'MARISQUERIA  COMO EN MANABI', 'MENDOZA ZAMBRANO MIRIAN MAGALI', 'ALIMENTOS, BEBIDAS Y ENTRETENIMIENTO', 'RESTAURANTE', '(1) Un tenedor'),
  ('12', '01', 'Babahoyo', '0701627507001.001.2000423', '0701627507001', 'GRAND HOTEL PERLA VERDE', 'GRANDA JUMBO FLOR ENIDT', 'ALOJAMIENTO', 'HOTEL', '3 Estrellas'),
  ('12', '01', 'Babahoyo', '0916860745001.002.3002330', '0916860745001', 'CHAU LAO', 'BRAVO FIGUEROA VERONICA LICETZ', 'ALIMENTOS, BEBIDAS Y ENTRETENIMIENTO', 'RESTAURANTE', '(2) Dos tenedores'),
  ('12', '01', 'Babahoyo', '0918342890001.001.3000820', '0918342890001', 'CHIFA MEI YUAN', 'YE ZHIYUAN', 'ALIMENTOS, BEBIDAS Y ENTRETENIMIENTO', 'RESTAURANTE', '(1) Un tenedor'),
  ('12', '01', 'Babahoyo', '0919922864001.002.3016350', '0919922864001', 'DONDE FERCHO', 'OCHOA PINTADO LUIS FERNANDO', 'ALIMENTOS, BEBIDAS Y ENTRETENIMIENTO', 'RESTAURANTE', '(1) Un tenedor'),
  ('12', '01', 'Babahoyo', '0931327555001.001.3001785', '0931327555001', 'YUE KONG DELI', 'HUANG XICHUN', 'ALIMENTOS, BEBIDAS Y ENTRETENIMIENTO', 'RESTAURANTE', '(1) Un tenedor'),
  ('12', '01', 'Babahoyo', '0963472642001.001.3002497', '0963472642001', 'HONG KONG DE BABAHOYO', 'ZHANG BIYI', 'ALIMENTOS, BEBIDAS Y ENTRETENIMIENTO', 'RESTAURANTE', '(1) Un tenedor'),
  ('12', '01', 'Babahoyo', '0963472642001.002.5000327', '0963472642001', 'CHIFA GUANG DONG', 'ZHANG BIYI', 'ALIMENTOS, BEBIDAS Y ENTRETENIMIENTO', 'RESTAURANTE', '(1) Un tenedor'),
  ('12', '01', 'Babahoyo', '0992876905001.008.3002964', '0992876905001', 'BOMBONS COFFEE SHOP', 'MAGNOLIA FOOD MAGNOFOOD S.A.', 'ALIMENTOS, BEBIDAS Y ENTRETENIMIENTO', 'CAFETERÍA', '(2) Dos tazas'),
  ('12', '01', 'Babahoyo', '0993112992001.033.3004621', '0993112992001', 'CARL''S BABAHOYO', 'RESTAURANTES UNIDOS RESTAUNSA S.A.', 'ALIMENTOS, BEBIDAS Y ENTRETENIMIENTO', 'RESTAURANTE', '(1) Un tenedor');

INSERT INTO localidades (canton_id, nombre, tipo_localidad, latitud, longitud, ubicacion, activo)
SELECT c.id, seed.localidad_nombre, seed.tipo_localidad, seed.latitud, seed.longitud,
       ST_SetSRID(ST_MakePoint(seed.longitud, seed.latitud), 4326)::GEOGRAPHY, TRUE
FROM (
  SELECT source.provincia_codigo, source.canton_codigo, source.localidad_nombre,
         source.tipo_localidad, source.latitud::NUMERIC, source.longitud::NUMERIC
  FROM (VALUES
  ('02', '01', 'Guaranda', 'CIUDAD', '-1.592630', '-79.000980'),
  ('06', '01', 'Riobamba', 'CIUDAD', '-1.663550', '-78.654650'),
  ('18', '01', 'Ambato', 'CIUDAD', '-1.249080', '-78.616750'),
  ('05', '01', 'Latacunga', 'CIUDAD', '-0.932650', '-78.614750'),
  ('12', '01', 'Babahoyo', 'CIUDAD', '-1.801460', '-79.534510')
  ) AS source(provincia_codigo, canton_codigo, localidad_nombre, tipo_localidad, latitud, longitud)
) AS seed
JOIN provincias p ON p.codigo_dpa = seed.provincia_codigo AND p.activo
JOIN cantones c ON c.provincia_id = p.id AND c.codigo_cton = seed.canton_codigo AND c.activo
ON CONFLICT (canton_id, nombre) DO UPDATE SET
  tipo_localidad = EXCLUDED.tipo_localidad,
  latitud = EXCLUDED.latitud,
  longitud = EXCLUDED.longitud,
  ubicacion = EXCLUDED.ubicacion,
  activo = TRUE;

INSERT INTO establecimientos_turisticos (
  localidad_id, numero_registro, ruc, nombre_comercial, razon_social, actividad,
  clasificacion, categoria, direccion, telefono, latitud, longitud,
  coordenadas_aproximadas, activo
)
SELECT l.id, seed.numero_registro, seed.ruc, seed.nombre_comercial, seed.razon_social,
       seed.actividad, seed.clasificacion, seed.categoria, NULL, NULL,
       l.latitud, l.longitud, TRUE, TRUE
FROM _catastro_demo_seed seed
JOIN provincias p ON p.codigo_dpa = seed.provincia_codigo AND p.activo
JOIN cantones c ON c.provincia_id = p.id AND c.codigo_cton = seed.canton_codigo AND c.activo
JOIN localidades l ON l.canton_id = c.id
                    AND l.nombre = seed.localidad_nombre
                    AND l.tipo_localidad = 'CIUDAD'
                    AND l.activo
ON CONFLICT (numero_registro) DO UPDATE SET
  localidad_id = EXCLUDED.localidad_id,
  ruc = EXCLUDED.ruc,
  nombre_comercial = EXCLUDED.nombre_comercial,
  razon_social = EXCLUDED.razon_social,
  actividad = EXCLUDED.actividad,
  clasificacion = EXCLUDED.clasificacion,
  categoria = EXCLUDED.categoria,
  -- La fuente no informa estos campos; no borrar enriquecimientos existentes al repetir el seed.
  direccion = COALESCE(EXCLUDED.direccion, establecimientos_turisticos.direccion),
  telefono = COALESCE(EXCLUDED.telefono, establecimientos_turisticos.telefono),
  latitud = COALESCE(establecimientos_turisticos.latitud, EXCLUDED.latitud),
  longitud = COALESCE(establecimientos_turisticos.longitud, EXCLUDED.longitud),
  coordenadas_aproximadas = CASE
    WHEN establecimientos_turisticos.latitud IS NULL
      OR establecimientos_turisticos.longitud IS NULL
    THEN TRUE
    ELSE establecimientos_turisticos.coordenadas_aproximadas
  END,
  activo = TRUE,
  updated_at = CURRENT_TIMESTAMP;

DO $$
DECLARE
  city RECORD;
  selected_count INTEGER;
BEGIN
  IF (SELECT COUNT(*) FROM _catastro_demo_seed) <> 50 THEN
    RAISE EXCEPTION 'El seed de catastro debe contener 50 registros';
  END IF;

  FOR city IN SELECT DISTINCT localidad_nombre FROM _catastro_demo_seed ORDER BY localidad_nombre LOOP
    SELECT COUNT(*) INTO selected_count
    FROM establecimientos_turisticos e
    JOIN _catastro_demo_seed seed ON seed.numero_registro = e.numero_registro
    WHERE seed.localidad_nombre = city.localidad_nombre AND e.activo;
    IF selected_count <> 10 THEN
      RAISE EXCEPTION 'La localidad % debe tener 10 establecimientos activos; tiene %',
        city.localidad_nombre, selected_count;
    END IF;
  END LOOP;

  IF (SELECT COUNT(*) FROM establecimientos_turisticos e
      JOIN _catastro_demo_seed seed ON seed.numero_registro = e.numero_registro
      WHERE e.activo) <> 50 THEN
    RAISE EXCEPTION 'El seed no dejó 50 establecimientos activos';
  END IF;
END;
$$;

COMMIT;
