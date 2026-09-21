-- Base de datos: turismo_vinculacion_app
-- PostgreSQL 15+ / PostGIS 3+
-- Ejecutar con psql: psql -U postgres -f turismo_vinculacion_app.sql

SELECT 'CREATE DATABASE turismo_vinculacion_app'
WHERE NOT EXISTS (
    SELECT 1 FROM pg_database WHERE datname = 'turismo_vinculacion_app'
)\gexec

\connect turismo_vinculacion_app

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

SET client_encoding = 'UTF8';
SET timezone = 'America/Guayaquil';

-- Usuarios y seguridad
CREATE TABLE usuarios (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    genero VARCHAR(30),
    fecha_nac DATE,
    password VARCHAR(255) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    email_verified_at TIMESTAMPTZ,
    remember_token VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE roles (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre_rol VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE usuarios_roles (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    rol_id BIGINT NOT NULL REFERENCES roles(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (rol_id, usuario_id)
);

CREATE TABLE parametros_ia (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    valor TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Catálogos territoriales y de clasificación
CREATE TABLE provincias (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo_dpa CHAR(2) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE cantones (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    provincia_id BIGINT NOT NULL REFERENCES provincias(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    codigo_cton CHAR(2) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (provincia_id, codigo_cton)
);

CREATE TABLE parroquias (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    canton_id BIGINT NOT NULL REFERENCES cantones(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    codigo_pqa CHAR(2) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (canton_id, codigo_pqa)
);

CREATE TABLE localidades (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    canton_id BIGINT NOT NULL REFERENCES cantones(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    nombre VARCHAR(150) NOT NULL,
    tipo_localidad VARCHAR(20) NOT NULL CHECK (tipo_localidad IN ('CIUDAD', 'POBLADO')),
    latitud NUMERIC(9,6) CHECK (latitud BETWEEN -90 AND 90),
    longitud NUMERIC(10,6) CHECK (longitud BETWEEN -180 AND 180),
    ubicacion GEOGRAPHY(POINT, 4326),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (canton_id, nombre)
);

CREATE TABLE zonas_turisticas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    localidad_id BIGINT NOT NULL REFERENCES localidades(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    nombre VARCHAR(180) NOT NULL,
    latitud NUMERIC(9,6) CHECK (latitud BETWEEN -90 AND 90),
    longitud NUMERIC(10,6) CHECK (longitud BETWEEN -180 AND 180),
    ubicacion GEOGRAPHY(POINT, 4326),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (localidad_id, nombre)
);

CREATE TABLE puntos_interes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    zona_turistica_id BIGINT NOT NULL REFERENCES zonas_turisticas(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    nombre VARCHAR(180) NOT NULL,
    latitud NUMERIC(9,6) NOT NULL CHECK (latitud BETWEEN -90 AND 90),
    longitud NUMERIC(10,6) NOT NULL CHECK (longitud BETWEEN -180 AND 180),
    ubicacion GEOGRAPHY(POINT, 4326) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE establecimientos_turisticos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    localidad_id BIGINT NOT NULL REFERENCES localidades(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    numero_registro VARCHAR(40) UNIQUE,
    ruc VARCHAR(13),
    nombre_comercial VARCHAR(180) NOT NULL,
    razon_social VARCHAR(200),
    actividad VARCHAR(180) NOT NULL,
    clasificacion VARCHAR(120),
    categoria VARCHAR(120),
    direccion TEXT,
    telefono VARCHAR(25),
    latitud NUMERIC(9,6) CHECK (latitud BETWEEN -90 AND 90),
    longitud NUMERIC(10,6) CHECK (longitud BETWEEN -180 AND 180),
    ubicacion GEOGRAPHY(POINT, 4326),
    coordenadas_aproximadas BOOLEAN NOT NULL DEFAULT FALSE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categorias_atractivo (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo CHAR(2) NOT NULL UNIQUE,
    nombre VARCHAR(120) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE tipos_atractivo (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    categoria_id BIGINT NOT NULL REFERENCES categorias_atractivo(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    codigo CHAR(2) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (categoria_id, codigo)
);

CREATE TABLE subtipos_atractivo (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tipo_atractivo_id BIGINT NOT NULL REFERENCES tipos_atractivo(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    codigo CHAR(2) NOT NULL,
    nombre VARCHAR(180) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (tipo_atractivo_id, codigo)
);

CREATE TABLE lineas_producto (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(60) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE escenarios (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(80) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE estados_resenia (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(80) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE rangos_jerarquia (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo CHAR(2) NOT NULL UNIQUE,
    nombre VARCHAR(30) NOT NULL UNIQUE,
    puntaje_minimo NUMERIC(5,2) NOT NULL,
    puntaje_maximo NUMERIC(5,2) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    CHECK (puntaje_minimo >= 0 AND puntaje_maximo <= 100 AND puntaje_maximo >= puntaje_minimo)
);

-- Entidad principal
CREATE TABLE centros_turisticos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo_atractivo CHAR(17) UNIQUE,
    secuencial_atractivo SMALLINT NOT NULL CHECK (secuencial_atractivo BETWEEN 1 AND 999),
    nombre VARCHAR(180) NOT NULL,
    subtipo_atractivo_id BIGINT NOT NULL REFERENCES subtipos_atractivo(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    zona_turistica_id BIGINT NOT NULL REFERENCES zonas_turisticas(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    parroquia_id BIGINT NOT NULL REFERENCES parroquias(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    linea_producto_id BIGINT NOT NULL REFERENCES lineas_producto(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    escenario_id BIGINT NOT NULL REFERENCES escenarios(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    jerarquia_id BIGINT REFERENCES rangos_jerarquia(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    estado_resenia_id BIGINT NOT NULL REFERENCES estados_resenia(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    puntaje_total NUMERIC(5,2) CHECK (puntaje_total BETWEEN 0 AND 100),
    barrio_sector_comuna VARCHAR(180),
    calle_principal VARCHAR(180),
    numero_direccion VARCHAR(30),
    calle_transversal VARCHAR(180),
    latitud NUMERIC(9,6) NOT NULL CHECK (latitud BETWEEN -90 AND 90),
    longitud NUMERIC(10,6) NOT NULL CHECK (longitud BETWEEN -180 AND 180),
    ubicacion GEOGRAPHY(POINT, 4326) NOT NULL,
    altitud_msnm INTEGER,
    descripcion VARCHAR(500),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    publicado_at TIMESTAMPTZ,
    UNIQUE (parroquia_id, secuencial_atractivo)
);

CREATE TABLE conversaciones_ia (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    centro_turistico_id BIGINT REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE mensajes_ia (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    conversacion_id BIGINT NOT NULL REFERENCES conversaciones_ia(id) ON UPDATE CASCADE ON DELETE CASCADE,
    rol_mensaje VARCHAR(20) NOT NULL CHECK (rol_mensaje IN ('SYSTEM', 'USER', 'ASSISTANT', 'TOOL')),
    contenido TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE opiniones (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    centro_turistico_id BIGINT REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    punto_interes_id BIGINT REFERENCES puntos_interes(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    calificacion SMALLINT CHECK (calificacion BETWEEN 1 AND 5),
    comentario TEXT,
    estado_moderacion VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado_moderacion IN ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'OCULTA')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK ((centro_turistico_id IS NOT NULL) <> (punto_interes_id IS NOT NULL)),
    CHECK (calificacion IS NOT NULL OR comentario IS NOT NULL)
);

CREATE TABLE moderaciones_opinion (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    opinion_id BIGINT NOT NULL REFERENCES opiniones(id) ON UPDATE CASCADE ON DELETE CASCADE,
    moderador_id BIGINT NOT NULL REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    accion VARCHAR(20) NOT NULL CHECK (accion IN ('APROBAR', 'RECHAZAR', 'OCULTAR', 'RESTAURAR')),
    motivo TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE favoritos_centros (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    centro_turistico_id BIGINT NOT NULL REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (usuario_id, centro_turistico_id)
);

CREATE TABLE favoritos_puntos_interes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    punto_interes_id BIGINT NOT NULL REFERENCES puntos_interes(id) ON UPDATE CASCADE ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (usuario_id, punto_interes_id)
);

CREATE TABLE revisiones_publicacion (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    solicitado_por BIGINT NOT NULL REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    revisado_por BIGINT REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL,
    estado_resenia_id BIGINT NOT NULL REFERENCES estados_resenia(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    datos_propuestos JSONB NOT NULL DEFAULT '{}'::JSONB,
    observacion TEXT,
    fecha_solicitud TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_revision TIMESTAMPTZ
);

CREATE TABLE auditoria_fichas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    accion VARCHAR(30) NOT NULL CHECK (accion IN ('CREAR', 'MODIFICAR', 'SOLICITAR_REVISION', 'APROBAR', 'RECHAZAR', 'PUBLICAR', 'DESACTIVAR', 'REACTIVAR')),
    seccion_codigo VARCHAR(20),
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE observaciones_seccion_centro_turistico (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    seccion_codigo VARCHAR(20) NOT NULL,
    contenido TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (centro_turistico_id, seccion_codigo)
);

CREATE TABLE administraciones_atractivo (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL UNIQUE REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    tipo_administrador VARCHAR(30) NOT NULL,
    institucion VARCHAR(180),
    nombre_administrador VARCHAR(180) NOT NULL,
    cargo VARCHAR(120),
    num_celular VARCHAR(25),
    email VARCHAR(254),
    observacion TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Características e ingreso
CREATE TABLE catalogo_clima (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(80) NOT NULL UNIQUE,
    descripcion TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE caracteristicas_climaticas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL UNIQUE REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    tipo_clima_id BIGINT NOT NULL REFERENCES catalogo_clima(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    temperatura_min_c NUMERIC(5,2),
    temperatura_max_c NUMERIC(5,2),
    precipitacion_min_mm NUMERIC(8,2),
    precipitacion_max_mm NUMERIC(8,2),
    observacion TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (temperatura_max_c IS NULL OR temperatura_min_c IS NULL OR temperatura_max_c >= temperatura_min_c),
    CHECK (precipitacion_max_mm IS NULL OR precipitacion_min_mm IS NULL OR precipitacion_max_mm >= precipitacion_min_mm)
);

CREATE TABLE tipos_ingreso (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(60) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE modalidades_atencion (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE ingresos_centro_turistico (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL UNIQUE REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    tipo_ingreso_id BIGINT NOT NULL REFERENCES tipos_ingreso(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    modalidad_atencion_id BIGINT NOT NULL REFERENCES modalidades_atencion(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    hora_ingreso TIME,
    hora_salida TIME,
    atencion_otro VARCHAR(180),
    maneja_reservas BOOLEAN NOT NULL DEFAULT FALSE,
    precio_desde NUMERIC(10,2),
    precio_hasta NUMERIC(10,2),
    observacion TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (precio_desde IS NULL OR precio_desde >= 0),
    CHECK (precio_hasta IS NULL OR precio_hasta >= 0),
    CHECK (precio_hasta IS NULL OR precio_desde IS NULL OR precio_hasta >= precio_desde)
);

CREATE TABLE formas_pago (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE centro_formas_pago (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    forma_pago_id BIGINT NOT NULL REFERENCES formas_pago(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    UNIQUE (centro_turistico_id, forma_pago_id)
);

CREATE TABLE meses (
    id SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    numero SMALLINT NOT NULL UNIQUE CHECK (numero BETWEEN 1 AND 12),
    nombre VARCHAR(20) NOT NULL UNIQUE
);

CREATE TABLE centro_meses_recomendados (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    mes_id SMALLINT NOT NULL REFERENCES meses(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    motivo TEXT,
    UNIQUE (centro_turistico_id, mes_id)
);

-- Accesibilidad, vías y transporte
CREATE TABLE centro_localidad_cercana (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL UNIQUE REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    localidad_id BIGINT NOT NULL REFERENCES localidades(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    distancia_km NUMERIC(8,2) CHECK (distancia_km IS NULL OR distancia_km >= 0),
    tiempo_desplazamiento INTERVAL,
    observacion TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE estados_condicion (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(80) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE tipos_via_terrestre (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE materiales_via (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE modalidades_acceso_acuatico (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE coberturas_acceso_aereo (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE vias_acceso_terrestre (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    tipo_via_terrestre_id BIGINT NOT NULL REFERENCES tipos_via_terrestre(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    latitud_inicio NUMERIC(9,6) CHECK (latitud_inicio BETWEEN -90 AND 90),
    longitud_inicio NUMERIC(10,6) CHECK (longitud_inicio BETWEEN -180 AND 180),
    latitud_fin NUMERIC(9,6) CHECK (latitud_fin BETWEEN -90 AND 90),
    longitud_fin NUMERIC(10,6) CHECK (longitud_fin BETWEEN -180 AND 180),
    distancia_km NUMERIC(8,2) CHECK (distancia_km IS NULL OR distancia_km >= 0),
    material_via_id BIGINT REFERENCES materiales_via(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    estado_condicion_id BIGINT REFERENCES estados_condicion(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    observacion TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE accesos_acuaticos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    modalidad_acceso_acuatico_id BIGINT NOT NULL REFERENCES modalidades_acceso_acuatico(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    puerto_embarque VARCHAR(180),
    estado_puerto_embarque_id BIGINT REFERENCES estados_condicion(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    puerto_llegada VARCHAR(180),
    estado_puerto_llegada_id BIGINT REFERENCES estados_condicion(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    observacion TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE accesos_aereos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    cobertura_acceso_aereo_id BIGINT NOT NULL REFERENCES coberturas_acceso_aereo(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    observacion TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tipos_transporte (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(80) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE frecuencias_servicio (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(40) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE transporte_centro (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL UNIQUE REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    detalle_otro VARCHAR(180),
    observacion TEXT
);

CREATE TABLE centro_tipos_transporte (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    tipo_transporte_id BIGINT NOT NULL REFERENCES tipos_transporte(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    UNIQUE (centro_turistico_id, tipo_transporte_id)
);

CREATE TABLE detalles_transporte (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    operador_cooperativa VARCHAR(180) NOT NULL,
    estacion_terminal VARCHAR(180),
    frecuencia_servicio_id BIGINT REFERENCES frecuencias_servicio(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    detalle_traslado TEXT,
    observacion TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cooperativas_transporte (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(180) NOT NULL,
    ruc VARCHAR(13) UNIQUE,
    telefono VARCHAR(25),
    email VARCHAR(254),
    direccion TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rutas_transporte (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cooperativa_id BIGINT NOT NULL REFERENCES cooperativas_transporte(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    tipo_transporte_id BIGINT NOT NULL REFERENCES tipos_transporte(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    nombre VARCHAR(180) NOT NULL,
    origen VARCHAR(180) NOT NULL,
    destino VARCHAR(180) NOT NULL,
    precio NUMERIC(10,2) CHECK (precio IS NULL OR precio >= 0),
    duracion_estimada INTERVAL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE paradas_transporte (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(180) NOT NULL,
    latitud NUMERIC(9,6) NOT NULL CHECK (latitud BETWEEN -90 AND 90),
    longitud NUMERIC(10,6) NOT NULL CHECK (longitud BETWEEN -180 AND 180),
    ubicacion GEOGRAPHY(POINT, 4326) NOT NULL,
    direccion_referencia TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ruta_paradas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ruta_transporte_id BIGINT NOT NULL REFERENCES rutas_transporte(id) ON UPDATE CASCADE ON DELETE CASCADE,
    parada_transporte_id BIGINT NOT NULL REFERENCES paradas_transporte(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    orden SMALLINT NOT NULL CHECK (orden > 0),
    tiempo_estimado_desde_origen INTERVAL,
    UNIQUE (ruta_transporte_id, parada_transporte_id),
    UNIQUE (ruta_transporte_id, orden)
);

CREATE TABLE horarios_ruta (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ruta_transporte_id BIGINT NOT NULL REFERENCES rutas_transporte(id) ON UPDATE CASCADE ON DELETE CASCADE,
    dia_semana SMALLINT NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
    hora_salida TIME NOT NULL,
    hora_llegada TIME,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE centro_rutas_transporte (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    ruta_transporte_id BIGINT NOT NULL REFERENCES rutas_transporte(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    parada_recomendada_id BIGINT REFERENCES paradas_transporte(id) ON UPDATE CASCADE ON DELETE SET NULL,
    indicacion_llegada TEXT,
    UNIQUE (centro_turistico_id, ruta_transporte_id)
);

CREATE TABLE tipos_accesibilidad (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE centro_accesibilidad_resumen (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    tipo_accesibilidad_id BIGINT NOT NULL REFERENCES tipos_accesibilidad(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    aplica BOOLEAN NOT NULL,
    observacion TEXT,
    UNIQUE (centro_turistico_id, tipo_accesibilidad_id)
);

CREATE TABLE criterios_accesibilidad (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tipo_accesibilidad_id BIGINT NOT NULL REFERENCES tipos_accesibilidad(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    descripcion TEXT NOT NULL,
    orden SMALLINT NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE respuestas_accesibilidad (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    criterio_accesibilidad_id BIGINT NOT NULL REFERENCES criterios_accesibilidad(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    cumple BOOLEAN,
    detalle TEXT,
    observacion TEXT,
    UNIQUE (centro_turistico_id, criterio_accesibilidad_id)
);

CREATE TABLE senalizaciones_aproximacion (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL UNIQUE REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    disponible BOOLEAN NOT NULL,
    estado_condicion_id BIGINT REFERENCES estados_condicion(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    observacion TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Planta turística y servicios complementarios
CREATE TABLE ambitos_ubicacion_servicio (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE tipos_planta_turistica (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    grupo VARCHAR(30) NOT NULL,
    codigo VARCHAR(40) NOT NULL UNIQUE,
    nombre VARCHAR(120) NOT NULL,
    unidad_1 VARCHAR(30) NOT NULL,
    unidad_2 VARCHAR(30),
    unidad_3 VARCHAR(30),
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE planta_turistica_centro (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    ambito_ubicacion_servicio_id BIGINT NOT NULL REFERENCES ambitos_ubicacion_servicio(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    tipo_planta_turistica_id BIGINT NOT NULL REFERENCES tipos_planta_turistica(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    cantidad_1 INTEGER CHECK (cantidad_1 IS NULL OR cantidad_1 >= 0),
    cantidad_2 INTEGER CHECK (cantidad_2 IS NULL OR cantidad_2 >= 0),
    cantidad_3 INTEGER CHECK (cantidad_3 IS NULL OR cantidad_3 >= 0),
    observacion TEXT,
    UNIQUE (centro_turistico_id, ambito_ubicacion_servicio_id, tipo_planta_turistica_id)
);

CREATE TABLE categorias_facilidad (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE tipos_facilidad (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    categoria_facilidad_id BIGINT NOT NULL REFERENCES categorias_facilidad(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    codigo VARCHAR(40) NOT NULL UNIQUE,
    nombre VARCHAR(140) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE facilidades_centro (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    tipo_facilidad_id BIGINT NOT NULL REFERENCES tipos_facilidad(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    cantidad SMALLINT NOT NULL DEFAULT 1 CHECK (cantidad >= 0),
    latitud NUMERIC(9,6) CHECK (latitud BETWEEN -90 AND 90),
    longitud NUMERIC(10,6) CHECK (longitud BETWEEN -180 AND 180),
    administrador VARCHAR(180),
    accesibilidad_universal BOOLEAN,
    estado_condicion_id BIGINT REFERENCES estados_condicion(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    detalle_otro VARCHAR(180),
    observacion TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tipos_servicio_complementario (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(40) NOT NULL UNIQUE,
    nombre VARCHAR(140) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE servicios_complementarios_centro (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    ambito_ubicacion_servicio_id BIGINT NOT NULL REFERENCES ambitos_ubicacion_servicio(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    tipo_servicio_complementario_id BIGINT NOT NULL REFERENCES tipos_servicio_complementario(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    especificacion VARCHAR(250),
    observacion TEXT
);

CREATE UNIQUE INDEX uq_servicios_complementarios
    ON servicios_complementarios_centro (
        centro_turistico_id,
        ambito_ubicacion_servicio_id,
        tipo_servicio_complementario_id,
        (COALESCE(especificacion, ''))
    );

-- Conservación
CREATE TABLE estados_conservacion (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(80) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE componentes_conservacion (
    id SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE evaluaciones_conservacion (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    componente_conservacion_id SMALLINT NOT NULL REFERENCES componentes_conservacion(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    estado_conservacion_id BIGINT NOT NULL REFERENCES estados_conservacion(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    observacion TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (centro_turistico_id, componente_conservacion_id)
);

CREATE TABLE factores_alteracion (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    origen VARCHAR(20) NOT NULL CHECK (origen IN ('NATURAL', 'ANTROPICO')),
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(180) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE evaluacion_factores_alteracion (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    evaluacion_conservacion_id BIGINT NOT NULL REFERENCES evaluaciones_conservacion(id) ON UPDATE CASCADE ON DELETE CASCADE,
    factor_alteracion_id BIGINT NOT NULL REFERENCES factores_alteracion(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    presente BOOLEAN NOT NULL,
    detalle_otro VARCHAR(180),
    observacion TEXT,
    UNIQUE (evaluacion_conservacion_id, factor_alteracion_id)
);

CREATE TABLE declaratorias_turisticas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    entidad_declarante VARCHAR(180) NOT NULL,
    denominacion VARCHAR(250) NOT NULL,
    fecha_declaratoria DATE,
    ambito VARCHAR(120),
    observacion TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Higiene y seguridad
CREATE TABLE categorias_servicio_basico (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(80) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE tipos_servicio_basico (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    categoria_servicio_basico_id BIGINT NOT NULL REFERENCES categorias_servicio_basico(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    codigo VARCHAR(40) NOT NULL UNIQUE,
    nombre VARCHAR(120) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE servicios_basicos_centro (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    ambito_ubicacion_servicio_id BIGINT NOT NULL REFERENCES ambitos_ubicacion_servicio(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    tipo_servicio_basico_id BIGINT NOT NULL REFERENCES tipos_servicio_basico(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    proveedor VARCHAR(180),
    especificacion VARCHAR(250),
    observacion TEXT,
    UNIQUE (centro_turistico_id, ambito_ubicacion_servicio_id, tipo_servicio_basico_id)
);

CREATE TABLE tipos_senaletica (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ambiente VARCHAR(30) NOT NULL,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(180) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE materiales_senaletica (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(60) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE senaletica_centro (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    tipo_senaletica_id BIGINT NOT NULL REFERENCES tipos_senaletica(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    material_senaletica_id BIGINT REFERENCES materiales_senaletica(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    cantidad SMALLINT CHECK (cantidad IS NULL OR cantidad >= 0),
    estado_condicion_id BIGINT REFERENCES estados_condicion(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    detalle VARCHAR(250),
    observacion TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tipos_servicio_salud (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE servicios_salud_centro (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    ambito_ubicacion_servicio_id BIGINT NOT NULL REFERENCES ambitos_ubicacion_servicio(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    tipo_servicio_salud_id BIGINT NOT NULL REFERENCES tipos_servicio_salud(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    cantidad SMALLINT CHECK (cantidad IS NULL OR cantidad >= 0),
    detalle_otro VARCHAR(180),
    observacion TEXT
);

CREATE TABLE tipos_servicio_seguridad (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE servicios_seguridad_centro (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    tipo_servicio_seguridad_id BIGINT NOT NULL REFERENCES tipos_servicio_seguridad(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    detalle VARCHAR(250),
    observacion TEXT
);

CREATE TABLE tipos_comunicacion (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    grupo VARCHAR(20) NOT NULL,
    codigo VARCHAR(40) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE comunicaciones_centro (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    ambito_ubicacion_servicio_id BIGINT NOT NULL REFERENCES ambitos_ubicacion_servicio(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    tipo_comunicacion_id BIGINT NOT NULL REFERENCES tipos_comunicacion(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    observacion TEXT,
    UNIQUE (centro_turistico_id, ambito_ubicacion_servicio_id, tipo_comunicacion_id)
);

CREATE TABLE radios_portatiles_centro (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL UNIQUE REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    disponible BOOLEAN NOT NULL,
    uso_visitantes BOOLEAN NOT NULL DEFAULT FALSE,
    uso_interno BOOLEAN NOT NULL DEFAULT FALSE,
    uso_emergencias BOOLEAN NOT NULL DEFAULT FALSE,
    cantidad SMALLINT CHECK (cantidad IS NULL OR cantidad >= 0),
    observacion TEXT
);

CREATE TABLE tipos_amenaza (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE amenazas_centro (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    tipo_amenaza_id BIGINT NOT NULL REFERENCES tipos_amenaza(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    presente BOOLEAN NOT NULL,
    observacion TEXT,
    UNIQUE (centro_turistico_id, tipo_amenaza_id)
);

-- Archivos se crean antes de las tablas que los referencian
CREATE TABLE tipos_archivo_centro_turistico (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(80) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE archivos_centro_turistico (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    tipo_archivo_centro_id BIGINT NOT NULL REFERENCES tipos_archivo_centro_turistico(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    nombre_original VARCHAR(255) NOT NULL,
    ruta_archivo TEXT NOT NULL,
    proveedor_almacenamiento VARCHAR(30) NOT NULL CHECK (proveedor_almacenamiento IN ('LOCAL', 'S3', 'CLOUDINARY', 'OTRO')),
    checksum_sha256 CHAR(64),
    mime_type VARCHAR(100) NOT NULL,
    tamano_bytes BIGINT CHECK (tamano_bytes IS NULL OR tamano_bytes >= 0),
    fuente_autor VARCHAR(250),
    descripcion TEXT,
    latitud NUMERIC(9,6) CHECK (latitud BETWEEN -90 AND 90),
    longitud NUMERIC(10,6) CHECK (longitud BETWEEN -180 AND 180),
    orden SMALLINT,
    observacion TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (checksum_sha256 IS NULL OR checksum_sha256 ~ '^[0-9a-fA-F]{64}$')
);

CREATE TABLE planes_contingencia (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    existe BOOLEAN NOT NULL,
    institucion_responsable VARCHAR(180),
    nombre_documento VARCHAR(250),
    anio SMALLINT,
    archivo_id BIGINT REFERENCES archivos_centro_turistico(id) ON UPDATE CASCADE ON DELETE SET NULL,
    observacion TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Políticas, actividades y promoción
CREATE TABLE preguntas_politica (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    pregunta TEXT NOT NULL,
    orden SMALLINT NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE respuestas_politica_centro (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    pregunta_politica_id BIGINT NOT NULL REFERENCES preguntas_politica(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    respuesta BOOLEAN NOT NULL,
    anio SMALLINT,
    especificacion TEXT,
    observacion TEXT,
    UNIQUE (centro_turistico_id, pregunta_politica_id)
);

CREATE TABLE grupos_actividad (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    categoria_atractivo_id BIGINT NOT NULL REFERENCES categorias_atractivo(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE actividades_turisticas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    grupo_actividad_id BIGINT NOT NULL REFERENCES grupos_actividad(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(180) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE actividades_centro_turistico (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    actividad_turistica_id BIGINT NOT NULL REFERENCES actividades_turisticas(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    activo BOOLEAN NOT NULL,
    detalle_otro VARCHAR(180),
    observacion TEXT,
    UNIQUE (centro_turistico_id, actividad_turistica_id)
);

CREATE TABLE promocion_centro_turistico (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL UNIQUE REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    tiene_plan_promocion BOOLEAN NOT NULL,
    nombre_plan VARCHAR(250),
    incluido_en_plan BOOLEAN,
    forma_parte_paquete BOOLEAN NOT NULL,
    detalle_paquete TEXT,
    observacion TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tipos_medio_promocion (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(40) NOT NULL UNIQUE,
    nombre VARCHAR(140) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE medios_promocion_centro_turistico (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    tipo_medio_promocion_id BIGINT NOT NULL REFERENCES tipos_medio_promocion(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    nombre VARCHAR(180),
    url VARCHAR(500),
    periodicidad VARCHAR(100),
    detalle_otro VARCHAR(180),
    observacion TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Visitantes y recurso humano
CREATE TABLE registros_visitantes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL UNIQUE REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    existe_registro BOOLEAN NOT NULL,
    tipo_registro VARCHAR(20) CHECK (tipo_registro IN ('DIGITAL', 'PAPEL')),
    anios_registro SMALLINT CHECK (anios_registro IS NULL OR anios_registro >= 0),
    genera_reportes BOOLEAN NOT NULL DEFAULT FALSE,
    frecuencia_reporte VARCHAR(80),
    observacion TEXT
);

CREATE TABLE temporadas_visitacion (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    tipo_temporada VARCHAR(10) NOT NULL CHECK (tipo_temporada IN ('ALTA', 'BAJA')),
    cantidad_visitantes INTEGER CHECK (cantidad_visitantes IS NULL OR cantidad_visitantes >= 0),
    anio SMALLINT,
    observacion TEXT,
    UNIQUE NULLS NOT DISTINCT (centro_turistico_id, tipo_temporada, anio)
);

CREATE TABLE temporada_meses (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    temporada_visitacion_id BIGINT NOT NULL REFERENCES temporadas_visitacion(id) ON UPDATE CASCADE ON DELETE CASCADE,
    mes_id SMALLINT NOT NULL REFERENCES meses(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    UNIQUE (temporada_visitacion_id, mes_id)
);

CREATE TABLE procedencias_visitantes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    tipo_procedencia VARCHAR(15) NOT NULL CHECK (tipo_procedencia IN ('NACIONAL', 'EXTRANJERA')),
    lugar VARCHAR(150) NOT NULL,
    mes_id SMALLINT REFERENCES meses(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    anio SMALLINT,
    cantidad_visitantes INTEGER CHECK (cantidad_visitantes IS NULL OR cantidad_visitantes >= 0),
    observacion TEXT
);

CREATE TABLE informantes_clave (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    nombre VARCHAR(180) NOT NULL,
    contacto VARCHAR(120),
    observacion TEXT
);

CREATE TABLE afluencia_visitantes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL UNIQUE REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    cantidad_entre_semana INTEGER CHECK (cantidad_entre_semana IS NULL OR cantidad_entre_semana >= 0),
    cantidad_fin_semana INTEGER CHECK (cantidad_fin_semana IS NULL OR cantidad_fin_semana >= 0),
    cantidad_feriados INTEGER CHECK (cantidad_feriados IS NULL OR cantidad_feriados >= 0),
    frecuencia_demanda VARCHAR(20) CHECK (frecuencia_demanda IN ('PERMANENTE', 'ESTACIONAL', 'ESPORADICA', 'INEXISTENTE')),
    observacion TEXT
);

CREATE TABLE resumen_recurso_humano (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL UNIQUE REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    personas_administracion_operacion INTEGER CHECK (personas_administracion_operacion IS NULL OR personas_administracion_operacion >= 0),
    personal_especializado_turismo INTEGER CHECK (personal_especializado_turismo IS NULL OR personal_especializado_turismo >= 0),
    observacion TEXT
);

CREATE TABLE tipos_formacion_personal (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    grupo VARCHAR(20) NOT NULL,
    codigo VARCHAR(40) NOT NULL UNIQUE,
    nombre VARCHAR(140) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE formacion_personal_centro (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    tipo_formacion_personal_id BIGINT NOT NULL REFERENCES tipos_formacion_personal(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    cantidad_personas INTEGER NOT NULL DEFAULT 0 CHECK (cantidad_personas >= 0),
    detalle_otro VARCHAR(180),
    observacion TEXT,
    UNIQUE (centro_turistico_id, tipo_formacion_personal_id)
);

-- Responsables y validaciones
CREATE TABLE tipos_responsabilidad_ficha (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE responsables_ficha (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    tipo_responsabilidad_ficha_id BIGINT NOT NULL REFERENCES tipos_responsabilidad_ficha(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    nombre VARCHAR(180) NOT NULL,
    institucion VARCHAR(180),
    cargo VARCHAR(140),
    email VARCHAR(254),
    telefono VARCHAR(25),
    firma_archivo_id BIGINT REFERENCES archivos_centro_turistico(id) ON UPDATE CASCADE ON DELETE SET NULL,
    fecha DATE,
    observacion TEXT,
    UNIQUE (centro_turistico_id, tipo_responsabilidad_ficha_id)
);

CREATE TABLE levantamientos_accesibilidad (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    fecha DATE,
    hora_inicio TIME,
    hora_fin TIME,
    responsable_nombre VARCHAR(180),
    responsable_institucion VARCHAR(180),
    firma_encuestado_archivo_id BIGINT REFERENCES archivos_centro_turistico(id) ON UPDATE CASCADE ON DELETE SET NULL,
    firma_responsable_archivo_id BIGINT REFERENCES archivos_centro_turistico(id) ON UPDATE CASCADE ON DELETE SET NULL,
    observacion TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE validaciones_gad (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    nombre_validador VARCHAR(180) NOT NULL,
    telefono VARCHAR(25),
    email VARCHAR(254),
    institucion VARCHAR(180) NOT NULL,
    cargo VARCHAR(140),
    fecha DATE,
    firma_archivo_id BIGINT REFERENCES archivos_centro_turistico(id) ON UPDATE CASCADE ON DELETE SET NULL,
    acepta_publicacion BOOLEAN,
    observacion TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Valoración
CREATE TABLE criterios_valoracion (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo CHAR(1) NOT NULL UNIQUE,
    nombre VARCHAR(180) NOT NULL,
    puntaje_maximo NUMERIC(5,2) NOT NULL CHECK (puntaje_maximo >= 0),
    orden SMALLINT NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE indicadores_valoracion (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    criterio_valoracion_id BIGINT NOT NULL REFERENCES criterios_valoracion(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    puntaje_maximo NUMERIC(5,2) NOT NULL CHECK (puntaje_maximo >= 0),
    regla_calculo TEXT NOT NULL,
    orden SMALLINT NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (criterio_valoracion_id, orden)
);

CREATE TABLE resultados_indicador (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    indicador_valoracion_id BIGINT NOT NULL REFERENCES indicadores_valoracion(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    valor_base NUMERIC(8,2),
    puntaje_obtenido NUMERIC(5,2) NOT NULL CHECK (puntaje_obtenido >= 0),
    detalle_calculo JSONB,
    observacion TEXT,
    calculado_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (centro_turistico_id, indicador_valoracion_id)
);

CREATE TABLE resultados_criterio (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centro_turistico_id BIGINT NOT NULL REFERENCES centros_turisticos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    criterio_valoracion_id BIGINT NOT NULL REFERENCES criterios_valoracion(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    puntaje_obtenido NUMERIC(5,2) NOT NULL,
    puntaje_maximo_aplicado NUMERIC(5,2) NOT NULL,
    calculado_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (centro_turistico_id, criterio_valoracion_id),
    CHECK (puntaje_obtenido BETWEEN 0 AND puntaje_maximo_aplicado)
);

-- Automatizaciones
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

DO $$
DECLARE
    tabla TEXT;
BEGIN
    FOREACH tabla IN ARRAY ARRAY[
        'usuarios', 'conversaciones_ia', 'parametros_ia', 'puntos_interes',
        'establecimientos_turisticos', 'catalogo_clima', 'centros_turisticos',
        'observaciones_seccion_centro_turistico', 'administraciones_atractivo',
        'caracteristicas_climaticas', 'ingresos_centro_turistico',
        'centro_localidad_cercana', 'vias_acceso_terrestre', 'accesos_acuaticos',
        'accesos_aereos', 'detalles_transporte', 'cooperativas_transporte',
        'rutas_transporte', 'paradas_transporte', 'senalizaciones_aproximacion',
        'facilidades_centro', 'evaluaciones_conservacion', 'declaratorias_turisticas',
        'senaletica_centro', 'archivos_centro_turistico', 'planes_contingencia',
        'promocion_centro_turistico', 'medios_promocion_centro_turistico',
        'levantamientos_accesibilidad', 'validaciones_gad'
    ]
    LOOP
        EXECUTE format(
            'CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at()',
            'trg_' || tabla || '_updated_at', tabla
        );
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION fn_sincronizar_ubicacion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.latitud IS NULL OR NEW.longitud IS NULL THEN
        NEW.ubicacion := NULL;
    ELSE
        NEW.ubicacion := ST_SetSRID(ST_MakePoint(NEW.longitud, NEW.latitud), 4326)::GEOGRAPHY;
    END IF;
    RETURN NEW;
END;
$$;

DO $$
DECLARE
    tabla TEXT;
BEGIN
    FOREACH tabla IN ARRAY ARRAY[
        'localidades', 'zonas_turisticas', 'puntos_interes',
        'establecimientos_turisticos', 'centros_turisticos', 'paradas_transporte'
    ]
    LOOP
        EXECUTE format(
            'CREATE TRIGGER %I BEFORE INSERT OR UPDATE OF latitud, longitud ON %I FOR EACH ROW EXECUTE FUNCTION fn_sincronizar_ubicacion()',
            'trg_' || tabla || '_ubicacion', tabla
        );
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION fn_preparar_centro_turistico()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_estado_inactivo_id BIGINT;
    v_codigo_provincia CHAR(2);
    v_codigo_canton CHAR(2);
    v_codigo_parroquia CHAR(2);
    v_codigo_categoria CHAR(2);
    v_codigo_tipo CHAR(2);
    v_codigo_subtipo CHAR(2);
    v_codigo_jerarquia CHAR(2);
BEGIN
    IF TG_OP = 'INSERT' AND NEW.secuencial_atractivo IS NULL THEN
        PERFORM 1 FROM parroquias WHERE id = NEW.parroquia_id FOR UPDATE;
        SELECT COALESCE(MAX(secuencial_atractivo), 0) + 1
          INTO NEW.secuencial_atractivo
          FROM centros_turisticos
         WHERE parroquia_id = NEW.parroquia_id;

        IF NEW.secuencial_atractivo > 999 THEN
            RAISE EXCEPTION 'La parroquia % alcanzó el máximo de 999 atractivos', NEW.parroquia_id;
        END IF;
    END IF;

    SELECT id INTO v_estado_inactivo_id
      FROM estados_resenia WHERE codigo = 'INACTIVO';

    IF NEW.activo = FALSE AND v_estado_inactivo_id IS NOT NULL THEN
        NEW.estado_resenia_id := v_estado_inactivo_id;
    ELSIF NEW.estado_resenia_id = v_estado_inactivo_id THEN
        NEW.activo := FALSE;
    END IF;

    IF NEW.jerarquia_id IS NULL THEN
        NEW.codigo_atractivo := NULL;
        RETURN NEW;
    END IF;

    SELECT p.codigo_dpa, c.codigo_cton, q.codigo_pqa
      INTO v_codigo_provincia, v_codigo_canton, v_codigo_parroquia
      FROM parroquias q
      JOIN cantones c ON c.id = q.canton_id
      JOIN provincias p ON p.id = c.provincia_id
     WHERE q.id = NEW.parroquia_id;

    SELECT ca.codigo, ta.codigo, sa.codigo
      INTO v_codigo_categoria, v_codigo_tipo, v_codigo_subtipo
      FROM subtipos_atractivo sa
      JOIN tipos_atractivo ta ON ta.id = sa.tipo_atractivo_id
      JOIN categorias_atractivo ca ON ca.id = ta.categoria_id
     WHERE sa.id = NEW.subtipo_atractivo_id;

    SELECT codigo INTO v_codigo_jerarquia
      FROM rangos_jerarquia WHERE id = NEW.jerarquia_id;

    NEW.codigo_atractivo :=
        v_codigo_provincia || v_codigo_canton || v_codigo_parroquia ||
        v_codigo_categoria || v_codigo_tipo || v_codigo_subtipo ||
        v_codigo_jerarquia || LPAD(NEW.secuencial_atractivo::TEXT, 3, '0');

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_centros_preparar
BEFORE INSERT OR UPDATE OF parroquia_id, subtipo_atractivo_id, jerarquia_id, activo, estado_resenia_id
ON centros_turisticos
FOR EACH ROW EXECUTE FUNCTION fn_preparar_centro_turistico();

CREATE OR REPLACE FUNCTION fn_validar_categoria_actividad()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_categoria_centro BIGINT;
    v_categoria_actividad BIGINT;
BEGIN
    SELECT ta.categoria_id
      INTO v_categoria_centro
      FROM centros_turisticos ct
      JOIN subtipos_atractivo sa ON sa.id = ct.subtipo_atractivo_id
      JOIN tipos_atractivo ta ON ta.id = sa.tipo_atractivo_id
     WHERE ct.id = NEW.centro_turistico_id;

    SELECT ga.categoria_atractivo_id
      INTO v_categoria_actividad
      FROM actividades_turisticas at
      JOIN grupos_actividad ga ON ga.id = at.grupo_actividad_id
     WHERE at.id = NEW.actividad_turistica_id;

    IF v_categoria_centro IS DISTINCT FROM v_categoria_actividad THEN
        RAISE EXCEPTION 'La actividad no corresponde a la categoría del centro turístico';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_actividad_categoria
BEFORE INSERT OR UPDATE OF centro_turistico_id, actividad_turistica_id
ON actividades_centro_turistico
FOR EACH ROW EXECUTE FUNCTION fn_validar_categoria_actividad();

CREATE OR REPLACE FUNCTION fn_recalcular_valoracion_centro()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_centro_id BIGINT;
    v_total NUMERIC(5,2);
    v_jerarquia_id BIGINT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_centro_id := OLD.centro_turistico_id;
    ELSE
        v_centro_id := NEW.centro_turistico_id;
    END IF;

    SELECT LEAST(COALESCE(SUM(puntaje_obtenido), 0), 100)
      INTO v_total
      FROM resultados_criterio
     WHERE centro_turistico_id = v_centro_id;

    SELECT id
      INTO v_jerarquia_id
      FROM rangos_jerarquia
     WHERE activo
       AND (
            (codigo = '00' AND v_total BETWEEN puntaje_minimo AND puntaje_maximo)
            OR
            (codigo <> '00' AND v_total > puntaje_minimo AND v_total <= puntaje_maximo)
       )
     ORDER BY puntaje_minimo DESC
     LIMIT 1;

    UPDATE centros_turisticos
       SET puntaje_total = v_total,
           jerarquia_id = v_jerarquia_id
     WHERE id = v_centro_id;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_resultados_criterio_recalcular
AFTER INSERT OR UPDATE OR DELETE ON resultados_criterio
FOR EACH ROW EXECUTE FUNCTION fn_recalcular_valoracion_centro();

CREATE OR REPLACE FUNCTION fn_impedir_cambio_auditoria()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Los registros de auditoría son inmutables';
END;
$$;

CREATE TRIGGER trg_auditoria_inmutable
BEFORE UPDATE OR DELETE ON auditoria_fichas
FOR EACH ROW EXECUTE FUNCTION fn_impedir_cambio_auditoria();

-- Índices de claves foráneas
DO $$
DECLARE
    r RECORD;
    columnas TEXT;
    nombre_indice TEXT;
BEGIN
    FOR r IN
        SELECT conrelid, conkey
          FROM pg_constraint
         WHERE contype = 'f'
           AND connamespace = 'public'::regnamespace
    LOOP
        SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY u.ord)
          INTO columnas
          FROM unnest(r.conkey) WITH ORDINALITY AS u(attnum, ord)
          JOIN pg_attribute a
            ON a.attrelid = r.conrelid
           AND a.attnum = u.attnum;

        nombre_indice := 'idx_fk_' || substr(md5(r.conrelid::TEXT || r.conkey::TEXT), 1, 20);
        EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %s (%s)', nombre_indice, r.conrelid::REGCLASS, columnas);
    END LOOP;
END;
$$;

-- Índices espaciales, búsqueda y consultas frecuentes
CREATE INDEX idx_localidades_ubicacion ON localidades USING GIST (ubicacion);
CREATE INDEX idx_zonas_turisticas_ubicacion ON zonas_turisticas USING GIST (ubicacion);
CREATE INDEX idx_puntos_interes_ubicacion ON puntos_interes USING GIST (ubicacion);
CREATE INDEX idx_establecimientos_ubicacion ON establecimientos_turisticos USING GIST (ubicacion);
CREATE INDEX idx_centros_ubicacion ON centros_turisticos USING GIST (ubicacion);
CREATE INDEX idx_paradas_ubicacion ON paradas_transporte USING GIST (ubicacion);

CREATE INDEX idx_centros_nombre_trgm ON centros_turisticos USING GIN (nombre gin_trgm_ops);
CREATE INDEX idx_centros_descripcion_trgm ON centros_turisticos USING GIN (descripcion gin_trgm_ops);
CREATE INDEX idx_puntos_nombre_trgm ON puntos_interes USING GIN (nombre gin_trgm_ops);
CREATE INDEX idx_establecimientos_nombre_trgm ON establecimientos_turisticos USING GIN (nombre_comercial gin_trgm_ops);
CREATE INDEX idx_centros_publicacion ON centros_turisticos (estado_resenia_id, activo, publicado_at DESC);
CREATE INDEX idx_centros_clasificacion ON centros_turisticos (subtipo_atractivo_id, activo);
CREATE INDEX idx_centros_territorio ON centros_turisticos (parroquia_id, zona_turistica_id, activo);
CREATE INDEX idx_opiniones_moderacion ON opiniones (estado_moderacion, created_at DESC);
CREATE INDEX idx_revisiones_pendientes ON revisiones_publicacion (estado_resenia_id, fecha_solicitud DESC);
CREATE INDEX idx_archivos_checksum ON archivos_centro_turistico (checksum_sha256) WHERE checksum_sha256 IS NOT NULL;

-- Datos iniciales indispensables
INSERT INTO roles (nombre_rol) VALUES
    ('ADMINISTRADOR'), ('TURISTA')
ON CONFLICT DO NOTHING;

INSERT INTO estados_resenia (codigo, nombre) VALUES
    ('BORRADOR', 'Borrador'),
    ('EN_REVISION', 'En revisión'),
    ('APROBADO', 'Aprobado'),
    ('PUBLICADO', 'Publicado'),
    ('RECHAZADO', 'Rechazado'),
    ('INACTIVO', 'Inactivo')
ON CONFLICT DO NOTHING;

INSERT INTO lineas_producto (codigo, nombre) VALUES
    ('CULTURA', 'Cultura'), ('NATURALEZA', 'Naturaleza'), ('AVENTURA', 'Aventura')
ON CONFLICT DO NOTHING;

INSERT INTO escenarios (codigo, nombre) VALUES
    ('PRISTINO', 'Prístino'),
    ('PRIMITIVO', 'Primitivo'),
    ('RUSTICO_NATURAL', 'Rústico natural'),
    ('RURAL', 'Rural'),
    ('URBANO', 'Urbano')
ON CONFLICT DO NOTHING;

INSERT INTO categorias_atractivo (codigo, nombre) VALUES
    ('AN', 'Atractivos naturales'),
    ('MC', 'Manifestaciones culturales')
ON CONFLICT DO NOTHING;

INSERT INTO rangos_jerarquia (codigo, nombre, puntaje_minimo, puntaje_maximo, descripcion) VALUES
    ('00', 'Recurso', 0, 10, 'Recurso con puntaje de 0 a 10'),
    ('01', 'I', 10, 35, 'Jerarquía I: más de 10 y hasta 35'),
    ('02', 'II', 35, 60, 'Jerarquía II: más de 35 y hasta 60'),
    ('03', 'III', 60, 85, 'Jerarquía III: más de 60 y hasta 85'),
    ('04', 'IV', 85, 100, 'Jerarquía IV: más de 85 y hasta 100')
ON CONFLICT DO NOTHING;

INSERT INTO criterios_valoracion (codigo, nombre, puntaje_maximo, orden) VALUES
    ('A', 'Accesibilidad y conectividad', 18, 1),
    ('B', 'Planta turística y servicios', 18, 2),
    ('C', 'Estado de conservación e integración', 14, 3),
    ('D', 'Higiene y seguridad turística', 14, 4),
    ('E', 'Políticas y regulaciones', 10, 5),
    ('F', 'Actividades que se practican', 9, 6),
    ('G', 'Difusión, medios de promoción y comercialización', 7, 7),
    ('H', 'Registro de visitantes y afluencia', 5, 8),
    ('I', 'Recurso humano', 5, 9)
ON CONFLICT DO NOTHING;

INSERT INTO meses (numero, nombre) VALUES
    (1, 'Enero'), (2, 'Febrero'), (3, 'Marzo'), (4, 'Abril'),
    (5, 'Mayo'), (6, 'Junio'), (7, 'Julio'), (8, 'Agosto'),
    (9, 'Septiembre'), (10, 'Octubre'), (11, 'Noviembre'), (12, 'Diciembre')
ON CONFLICT DO NOTHING;

INSERT INTO estados_condicion (codigo, nombre) VALUES
    ('BUENO', 'Bueno'), ('REGULAR', 'Regular'), ('MALO', 'Malo')
ON CONFLICT DO NOTHING;

INSERT INTO tipos_via_terrestre (codigo, nombre) VALUES
    ('PRIMER_ORDEN', 'Primer orden'),
    ('SEGUNDO_ORDEN', 'Segundo orden'),
    ('TERCER_ORDEN', 'Tercer orden')
ON CONFLICT DO NOTHING;

INSERT INTO modalidades_acceso_acuatico (codigo, nombre) VALUES
    ('MARITIMO', 'Marítimo'), ('LACUSTRE', 'Lacustre'), ('FLUVIAL', 'Fluvial')
ON CONFLICT DO NOTHING;

INSERT INTO coberturas_acceso_aereo (codigo, nombre) VALUES
    ('NACIONAL', 'Nacional'), ('INTERNACIONAL', 'Internacional')
ON CONFLICT DO NOTHING;

INSERT INTO tipos_ingreso (codigo, nombre) VALUES
    ('LIBRE', 'Libre'), ('RESTRINGIDO', 'Restringido'), ('PAGADO', 'Pagado')
ON CONFLICT DO NOTHING;

INSERT INTO modalidades_atencion (codigo, nombre) VALUES
    ('TODOS_DIAS', 'Todos los días'),
    ('FINES_SEMANA_FERIADOS', 'Fines de semana y feriados'),
    ('DIAS_HABILES', 'Solo días hábiles'),
    ('OTRO', 'Otro')
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

INSERT INTO frecuencias_servicio (codigo, nombre) VALUES
    ('DIARIO', 'Diario'), ('SEMANAL', 'Semanal'),
    ('MENSUAL', 'Mensual'), ('EVENTUAL', 'Eventual')
ON CONFLICT DO NOTHING;

INSERT INTO ambitos_ubicacion_servicio (codigo, nombre) VALUES
    ('EN_ATRACTIVO', 'En el atractivo'),
    ('EN_POBLADO_CERCANO', 'En el poblado cercano')
ON CONFLICT DO NOTHING;

INSERT INTO componentes_conservacion (codigo, nombre) VALUES
    ('ATRACTIVO', 'Atractivo'), ('ENTORNO', 'Entorno')
ON CONFLICT DO NOTHING;

INSERT INTO tipos_archivo_centro_turistico (codigo, nombre) VALUES
    ('FOTOGRAFIA', 'Fotografía'),
    ('MAPA', 'Mapa'),
    ('PLAN_CONTINGENCIA', 'Plan de contingencia'),
    ('OTRO', 'Otro anexo')
ON CONFLICT DO NOTHING;

INSERT INTO tipos_responsabilidad_ficha (codigo, nombre) VALUES
    ('ELABORO', 'Elaboró'), ('VALIDO', 'Validó'), ('APROBO', 'Aprobó')
ON CONFLICT DO NOTHING;

COMMENT ON DATABASE turismo_vinculacion_app IS
    'Sistema de vinculación y gestión de atractivos turísticos';
