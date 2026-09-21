# Modelo relacional completo de la ficha del centro A. Tablas generales del sistema

## `usuarios`

**Contexto:** cuentas que administran o consultan el sistema.

id BIGINT (PK)

nombre VARCHAR(150) NOT NULL

email VARCHAR(254) NOT NULL UNIQUE

genero VARCHAR(30) NULL

fecha\_nac DATE NULL

password VARCHAR(255) NOT NULL

activo BOOLEAN NOT NULL DEFAULT TRUE

email\_verified\_at TIMESTAMPTZ NULL

remember\_token VARCHAR(100) NULL

created\_at TIMESTAMPTZ NOT NULL

updated\_at TIMESTAMPTZ NOT NULL

&nbsp;

---

## `roles`

id BIGINT (PK)

nombre\_rol VARCHAR(80) NOT NULL UNIQUE

## `usuarios_roles`

id BIGINT (PK)

rol\_id BIGINT (FK → roles.id) NOT NULL

usuario\_id BIGINT (FK → usuarios.id) NOT NULL

created\_at TIMESTAMPTZ NOT NULL

updated\_at TIMESTAMPTZ NOT NULL

UNIQUE (rol\_id, usuario\_id)

**Cardinalidad:** `usuarios N:M roles`.

## `conversaciones_ia`

id BIGINT (PK)

usuario\_id BIGINT (FK → usuarios.id) NOT NULL

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NULL

created\_at TIMESTAMPTZ NOT NULL

updated\_at TIMESTAMPTZ NOT NULL

## `mensajes_ia`

id BIGINT (PK)

conversacion\_id BIGINT (FK → conversaciones\_ia.id) NOT NULL

rol\_mensaje VARCHAR(20) NOT NULL

contenido TEXT NOT NULL

created\_at TIMESTAMPTZ NOT NULL

## `parametros_ia`

id BIGINT (PK)

nombre VARCHAR(100) NOT NULL UNIQUE

valor TEXT NOT NULL

created\_at TIMESTAMPTZ NOT NULL

updated\_at TIMESTAMPTZ NOT NULL

**Cardinalidades:**

usuarios 1:N conversaciones\_ia

centros\_turisticos 1:N conversaciones\_ia

conversaciones\_ia 1:N mensajes\_ia

---

## `auditoria_fichas`

**Contexto:** registra quién realizó cada acción relevante sobre una ficha turística. El historial no se elimina cuando una ficha o un usuario se desactiva.

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL

usuario\_id BIGINT (FK → usuarios.id) NOT NULL

accion VARCHAR(30) NOT NULL

seccion\_codigo VARCHAR(20) NULL

datos\_anteriores JSONB NULL

datos\_nuevos JSONB NULL

created\_at TIMESTAMPTZ NOT NULL

CHECK (accion IN ('CREAR', 'MODIFICAR', 'SOLICITAR_REVISION', 'APROBAR', 'RECHAZAR', 'PUBLICAR', 'DESACTIVAR', 'REACTIVAR'))

**Cardinalidades:**

centros\_turisticos 1:N auditoria\_fichas

usuarios 1:N auditoria\_fichas

`seccion_codigo` es obligatorio para `MODIFICAR` cuando el cambio pertenece a una sección concreta. Los registros de auditoría son inmutables: no se actualizan ni se eliminan desde la aplicación.

---

# B. Catálogos DPA y clasificación

## `provincias`

**Origen:** hoja `DPA`.

id BIGINT (PK)

codigo\_dpa CHAR(2) NOT NULL UNIQUE

nombre VARCHAR(100) NOT NULL

activo BOOLEAN NOT NULL DEFAULT TRUE

## `cantones`

**Origen:** hoja `DPA`.

id BIGINT (PK)

provincia\_id BIGINT (FK → provincias.id) NOT NULL

codigo\_cton CHAR(2) NOT NULL

nombre VARCHAR(100) NOT NULL

activo BOOLEAN NOT NULL DEFAULT TRUE

UNIQUE (provincia\_id, codigo\_cton)

## `parroquias`

**Origen:** hoja `DPA`. No se agrega tipo urbano/rural porque no está en la ficha.

id BIGINT (PK)

canton\_id BIGINT (FK → cantones.id) NOT NULL

codigo\_pqa CHAR(2) NOT NULL

nombre VARCHAR(150) NOT NULL

activo BOOLEAN NOT NULL DEFAULT TRUE

UNIQUE (canton\_id, codigo\_pqa)

### `localidades`

**Contexto:** registra las ciudades o poblados que pueden ser utilizados como referencia territorial para un centro turístico.

id BIGINT (PK)

canton\_id BIGINT (FK → cantones.id) NOT NULL

nombre VARCHAR(150) NOT NULL

tipo\_localidad VARCHAR(20) NOT NULL

latitud NUMERIC(9,6) NULL

longitud NUMERIC(10,6) NULL

ubicacion GEOGRAPHY(POINT, 4326) NULL

activo BOOLEAN NOT NULL DEFAULT TRUE

CHECK (tipo\_localidad IN ('CIUDAD', 'POBLADO'))

UNIQUE (canton\_id, nombre)

&nbsp;

### `zonas_turisticas`

**Contexto:** agrupa centros turísticos y puntos de interés dentro de un área turística perteneciente a una localidad.

id BIGINT (PK)

localidad\_id BIGINT (FK → localidades.id) NOT NULL

nombre VARCHAR(180) NOT NULL

latitud NUMERIC(9,6) NULL

longitud NUMERIC(10,6) NULL

ubicacion GEOGRAPHY(POINT, 4326) NULL

activo BOOLEAN NOT NULL DEFAULT TRUE

UNIQUE (localidad\_id, nombre)

&nbsp;

### `puntos_interes`

**Contexto:** almacena los lugares de interés que pertenecen a una zona turística.

id BIGINT (PK)

zona\_turistica\_id BIGINT (FK → zonas\_turisticas.id) NOT NULL

nombre VARCHAR(180) NOT NULL

latitud NUMERIC(9,6) NOT NULL

longitud NUMERIC(10,6) NOT NULL

ubicacion GEOGRAPHY(POINT, 4326) NOT NULL

descripcion TEXT NULL

activo BOOLEAN NOT NULL DEFAULT TRUE

created\_at TIMESTAMPTZ NOT NULL

updated\_at TIMESTAMPTZ NOT NULL

### `establecimientos_turisticos`

**Contexto:** almacena los hoteles, hostales, restaurantes, cafeterías, agencias, operadoras y demás establecimientos provenientes del catastro turístico.

id BIGINT (PK)

localidad\_id BIGINT (FK → localidades.id) NOT NULL

numero\_registro VARCHAR(40) NULL UNIQUE

ruc VARCHAR(13) NULL

nombre\_comercial VARCHAR(180) NOT NULL

razon\_social VARCHAR(200) NULL

actividad VARCHAR(180) NOT NULL

clasificacion VARCHAR(120) NULL

categoria VARCHAR(120) NULL

actividad_catalogo_id BIGINT (FK → catalogo_catastro_actividades.id) NULL

clasificacion_catalogo_id BIGINT (FK → catalogo_catastro_clasificaciones.id) NULL

categoria_catalogo_id BIGINT (FK → catalogo_catastro_categorias.id) NULL

direccion TEXT NULL

telefono VARCHAR(25) NULL

latitud NUMERIC(9,6) NOT NULL

longitud NUMERIC(10,6) NOT NULL

ubicacion GEOGRAPHY(POINT, 4326) NULL

coordenadas\_aproximadas BOOLEAN NOT NULL DEFAULT FALSE

activo BOOLEAN NOT NULL DEFAULT TRUE

created\_at TIMESTAMPTZ NOT NULL

updated\_at TIMESTAMPTZ NOT NULL

Las columnas de texto conservan el valor del consolidado. Las tres relaciones opcionales
resuelven la taxonomía canónica actividad → clasificación → categoría y permiten una
normalización progresiva sin perder aliases del origen.

&nbsp;

&nbsp;

## `opiniones`

**Contexto:** representa la opinión lógica de un turista sobre un centro turístico o punto de interés. El contenido se conserva en `opinion_versiones`.

id BIGINT (PK)

usuario\_id BIGINT (FK → usuarios.id) NOT NULL

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NULL

punto\_interes\_id BIGINT (FK → puntos\_interes.id) NULL

estado\_moderacion VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'

version\_publicada\_id BIGINT (FK → opinion_versiones.id) NULL

created\_at TIMESTAMPTZ NOT NULL

updated\_at TIMESTAMPTZ NOT NULL

CHECK (estado\_moderacion IN ('PENDIENTE', 'APROBADA', 'RECHAZADA'))

CHECK (

&nbsp;&nbsp;&nbsp;&nbsp;(centro\_turistico\_id IS NOT NULL AND punto\_interes\_id IS NULL)

&nbsp;&nbsp;&nbsp;&nbsp;OR

&nbsp;&nbsp;&nbsp;&nbsp;(centro\_turistico\_id IS NULL AND punto\_interes\_id IS NOT NULL)

)

Una opinión pertenece a un centro turístico o a un punto de interés. Una edición crea una nueva versión pendiente sin reemplazar la versión publicada.

## `opinion_versiones`

**Contexto:** conserva cada envío de una opinión y su resultado de moderación.

id BIGINT (PK)

codigo\_publico UUID NOT NULL UNIQUE

opinion\_id BIGINT (FK → opiniones.id) NOT NULL

numero\_version SMALLINT NOT NULL

calificacion SMALLINT NULL

comentario TEXT NULL

estado\_moderacion VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'

created\_at TIMESTAMPTZ NOT NULL

revisado\_at TIMESTAMPTZ NULL

CHECK (calificacion IS NULL OR calificacion BETWEEN 1 AND 5\)

CHECK (estado\_moderacion IN ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'REEMPLAZADA'))

CHECK (calificacion IS NOT NULL OR comentario no vacío)

UNIQUE (opinion\_id, numero\_version)

Solo una versión puede estar pendiente y solo una puede estar aprobada dentro de una opinión lógica. `REEMPLAZADA` es un estado histórico interno para la versión pública anterior.

## `moderaciones_opinion`

**Contexto:** conserva las decisiones tomadas por el administrador sobre una versión.

id BIGINT (PK)

opinion\_id BIGINT (FK → opiniones.id) NOT NULL

opinion\_version\_id BIGINT (FK → opinion_versiones.id) NOT NULL

moderador\_id BIGINT (FK → usuarios.id) NOT NULL

accion VARCHAR(20) NOT NULL

motivo TEXT NULL

created\_at TIMESTAMPTZ NOT NULL

CHECK (accion IN ('APROBAR', 'RECHAZAR'))

**Cardinalidades:**

usuarios 1:N opiniones

centros\_turisticos 1:N opiniones

puntos\_interes 1:N opiniones

opiniones 1:N opinion\_versiones

opiniones 1:N moderaciones\_opinion

opinion\_versiones 1:N moderaciones\_opinion

usuarios 1:N moderaciones\_opinion

&nbsp;

## `favoritos_centros`

**Contexto:** relaciona a un turista con los centros turísticos que guardó como favoritos.

id BIGINT (PK)

usuario\_id BIGINT (FK → usuarios.id) NOT NULL

centro\_turistico\_id BIGINT

(FK → centros\_turisticos.id) NOT NULL

created\_at TIMESTAMPTZ NOT NULL

UNIQUE (usuario\_id, centro\_turistico\_id)

**Cardinalidad:** `usuarios N:M centros_turisticos`.

## `favoritos_puntos_interes`

**Contexto:** relaciona a un turista con los puntos de interés que guardó como favoritos.

id BIGINT (PK)

usuario\_id BIGINT (FK → usuarios.id) NOT NULL

punto\_interes\_id BIGINT

(FK → puntos\_interes.id) NOT NULL

created\_at TIMESTAMPTZ NOT NULL

UNIQUE (usuario\_id, punto\_interes\_id)

**Cardinalidad:** `usuarios N:M puntos_interes`.

&nbsp;

&nbsp;

&nbsp;

## `revisiones_publicacion`

id BIGINT (PK)

centro\_turistico\_id BIGINT

(FK → centros\_turisticos.id) NOT NULL

solicitado\_por BIGINT

(FK → usuarios.id) NOT NULL

revisado\_por BIGINT

(FK → usuarios.id) NULL

estado\_resenia\_id BIGINT (FK → estados\_resenia.id) NOT NULL

datos\_propuestos JSONB NOT NULL

observacion TEXT NULL

fecha\_solicitud TIMESTAMPTZ NOT NULL

fecha\_revision TIMESTAMPTZ NULL

&nbsp;

centros\_turisticos 1:N revisiones\_publicacion

usuarios 1:N revisiones\_publicacion como solicitante

usuarios 1:N revisiones\_publicacion como revisor

estados\_resenia 1:N revisiones\_publicacion

`datos_propuestos` contiene únicamente los cambios pendientes. Las modificaciones críticas no se aplican a la ficha publicada hasta que la revisión sea aprobada.

## `categorias_atractivo`

id BIGINT (PK)

codigo CHAR(2) NOT NULL UNIQUE

nombre VARCHAR(120) NOT NULL UNIQUE

activo BOOLEAN NOT NULL DEFAULT TRUE

Valores: `AN — Atractivos naturales`, `MC — Manifestaciones culturales`.

## `tipos_atractivo`

id BIGINT (PK)

categoria\_id BIGINT (FK → categorias\_atractivo.id) NOT NULL

codigo CHAR(2) NOT NULL

nombre VARCHAR(150) NOT NULL

activo BOOLEAN NOT NULL DEFAULT TRUE

UNIQUE (categoria\_id, codigo)

## `subtipos_atractivo`

id BIGINT (PK)

tipo\_atractivo\_id BIGINT (FK → tipos\_atractivo.id) NOT NULL

codigo CHAR(2) NOT NULL

nombre VARCHAR(180) NOT NULL

activo BOOLEAN NOT NULL DEFAULT TRUE

UNIQUE (tipo\_atractivo\_id, codigo)

**Cardinalidades:**

cantones 1:N localidades

localidades 1:N zonas\_turisticas

zonas\_turisticas 1:N centros\_turisticos

zonas\_turisticas 1:N puntos\_interes

centros\_turisticos 1:1 centro\_localidad\_cercana

localidades 1:N centro\_localidad\_cercana

localidades 1:N establecimientos\_turisticos

---

# 1\. Datos generales

## 1.1–1.4 `centros_turisticos`

**Contexto:** entidad principal. Una fila representa toda la ficha de un centro turístico.

id BIGINT (PK)

codigo\_atractivo CHAR(17) NULL UNIQUE

secuencial\_atractivo SMALLINT NOT NULL

nombre VARCHAR(180) NOT NULL

subtipo\_atractivo\_id BIGINT (FK → subtipos\_atractivo.id) NOT NULL

zona\_turistica\_id BIGINT (FK → zonas\_turisticas.id) NOT NULL

parroquia\_id BIGINT (FK → parroquias.id) NOT NULL

linea\_producto\_id BIGINT (FK → lineas\_producto.id) NOT NULL

escenario\_id BIGINT (FK → escenarios.id) NOT NULL

jerarquia\_id BIGINT (FK → rangos\_jerarquia.id) NULL

estado\_resenia\_id BIGINT (FK → estados\_resenia.id) NOT NULL

puntaje\_total NUMERIC(5,2) NULL

barrio\_sector\_comuna VARCHAR(180) NULL

calle\_principal VARCHAR(180) NULL

numero\_direccion VARCHAR(30) NULL

calle\_transversal VARCHAR(180) NULL

latitud NUMERIC(9,6) NOT NULL

longitud NUMERIC(10,6) NOT NULL

ubicacion GEOGRAPHY(POINT, 4326) NOT NULL

altitud\_msnm INTEGER NULL

descripcion VARCHAR(500) NULL

activo BOOLEAN NOT NULL DEFAULT TRUE

created\_at TIMESTAMPTZ NOT NULL

updated\_at TIMESTAMPTZ NOT NULL

publicado\_at TIMESTAMPTZ NULL

UNIQUE (parroquia\_id, secuencial\_atractivo)

CHECK (secuencial\_atractivo BETWEEN 1 AND 999\)

CHECK (puntaje\_total IS NULL OR puntaje\_total BETWEEN 0 AND 100\)

`codigo_atractivo`, `jerarquia_id` y `puntaje_total` se calculan automáticamente. El centro se vincula al subtipo; la categoría y el tipo se obtienen mediante sus relaciones y no se duplican en esta tabla.

&nbsp;

&nbsp;

## `estados_resenia`

id BIGINT (PK)

codigo VARCHAR(30) NOT NULL UNIQUE

nombre VARCHAR(80) NOT NULL UNIQUE

activo BOOLEAN NOT NULL DEFAULT TRUE

Valores iniciales: `BORRADOR`, `EN_REVISION`, `APROBADO`, `PUBLICADO`, `RECHAZADO` e `INACTIVO`.

**Cardinalidad:** `estados_resenia 1:N centros_turisticos`.

Una ficha nueva comienza en `BORRADOR`. Para publicarse debe pasar por `EN_REVISION`, `APROBADO` y `PUBLICADO`. Una ficha desactivada pasa a `INACTIVO`, pero conserva todos sus datos e historial.

## Observaciones de cada apartado

### `observaciones_seccion_centro_turistico`

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL

seccion\_codigo VARCHAR(20) NOT NULL

contenido TEXT NOT NULL

created\_at TIMESTAMPTZ NOT NULL

updated\_at TIMESTAMPTZ NOT NULL

UNIQUE (centro\_turistico\_id, seccion\_codigo)

`seccion_codigo` conserva el número exacto de la ficha, por ejemplo `2.11`, `3.4`, `4.1`, `4.2_TERRESTRE`, `4.2_ACUATICO`, `4.2_AEREO`, `4.3`, `4.4`, `4.5`, hasta `12`. Esta tabla garantiza que ninguna observación general se pierda aunque una sección no tenga opciones seleccionadas. Los campos `observacion` de las tablas de detalle se reservan para comentarios de una fila concreta.

---

# 2\. Ubicación del atractivo

Los datos 2.1–2.10 se almacenan en `centros_turisticos`. Provincia y cantón se obtienen mediante `parroquia_id`; no se duplican como FK adicionales.

## 2.11 `administraciones_atractivo`

**Origen:** sección 2.11 Información del administrador.

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL UNIQUE

tipo\_administrador VARCHAR(30) NOT NULL

institucion VARCHAR(180) NULL

nombre\_administrador VARCHAR(180) NOT NULL

cargo VARCHAR(120) NULL

num\_celular VARCHAR(25) NULL

email VARCHAR(254) NULL

observacion TEXT NULL

created\_at TIMESTAMPTZ NOT NULL

updated\_at TIMESTAMPTZ NOT NULL

**Cardinalidad:** `centros_turisticos 1:1 administraciones_atractivo`.

---

# 3\. Características del atractivo

## 3.1 Catálogo de clima

### `catalogo_clima`

**Contexto:** normaliza nombres de clima y evita variantes de escritura.

id BIGINT (PK)

codigo VARCHAR(30) NOT NULL UNIQUE

nombre VARCHAR(80) NOT NULL UNIQUE

descripcion TEXT NULL

activo BOOLEAN NOT NULL DEFAULT TRUE

created\_at TIMESTAMPTZ NOT NULL

updated\_at TIMESTAMPTZ NOT NULL

### `caracteristicas_climaticas`

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL UNIQUE

tipo\_clima\_id BIGINT (FK → catalogo\_clima.id) NOT NULL

temperatura\_min\_c NUMERIC(5,2) NULL

temperatura\_max\_c NUMERIC(5,2) NULL

precipitacion\_min\_mm NUMERIC(8,2) NULL

precipitacion\_max\_mm NUMERIC(8,2) NULL

observacion TEXT NULL

created\_at TIMESTAMPTZ NOT NULL

updated\_at TIMESTAMPTZ NOT NULL

CHECK (temperatura\_max\_c IS NULL OR temperatura\_min\_c IS NULL OR temperatura\_max\_c \>= temperatura\_min\_c)

CHECK (precipitacion\_max\_mm IS NULL OR precipitacion\_min\_mm IS NULL OR precipitacion\_max\_mm \>= precipitacion\_min\_mm)

**Cardinalidad:** `centros_turisticos 1:1 caracteristicas_climaticas`.

## 3.2 Línea de producto

### `lineas_producto`

id BIGINT (PK)

codigo VARCHAR(20) NOT NULL UNIQUE

nombre VARCHAR(60) NOT NULL UNIQUE

activo BOOLEAN NOT NULL DEFAULT TRUE

Valores: `CULTURA`, `NATURALEZA`, `AVENTURA`.

La marca `(U)` indica selección única; `linea_producto_id` está en `centros_turisticos`.

## 3.3 Escenario

### `escenarios`

id BIGINT (PK)

codigo VARCHAR(30) NOT NULL UNIQUE

nombre VARCHAR(80) NOT NULL UNIQUE

activo BOOLEAN NOT NULL DEFAULT TRUE

Valores: prístino, primitivo, rústico natural, rural y urbano.

La selección es única; `escenario_id` está en `centros_turisticos`.

## 3.4 Ingreso al atractivo

### `tipos_ingreso`

id BIGINT (PK)

codigo VARCHAR(20) NOT NULL UNIQUE

nombre VARCHAR(60) NOT NULL UNIQUE

activo BOOLEAN NOT NULL DEFAULT TRUE

Valores: libre, restringido y pagado.

### `modalidades_atencion`

id BIGINT (PK)

codigo VARCHAR(30) NOT NULL UNIQUE

nombre VARCHAR(100) NOT NULL UNIQUE

activo BOOLEAN NOT NULL DEFAULT TRUE

Valores: todos los días, fines de semana y feriados, solo días hábiles y otro.

### `ingresos_centro_turistico`

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL UNIQUE

tipo\_ingreso\_id BIGINT (FK → tipos\_ingreso.id) NOT NULL

modalidad\_atencion\_id BIGINT (FK → modalidades\_atencion.id) NOT NULL

hora\_ingreso TIME NULL

hora\_salida TIME NULL

atencion\_otro VARCHAR(180) NULL

maneja\_reservas BOOLEAN NOT NULL DEFAULT FALSE

precio\_desde NUMERIC(10,2) NULL

precio\_hasta NUMERIC(10,2) NULL

observacion TEXT NULL

created\_at TIMESTAMPTZ NOT NULL

updated\_at TIMESTAMPTZ NOT NULL

CHECK (precio\_hasta IS NULL OR precio\_desde IS NULL OR precio\_hasta \>= precio\_desde)

### `formas_pago`

id BIGINT (PK)

codigo VARCHAR(30) NOT NULL UNIQUE

nombre VARCHAR(100) NOT NULL UNIQUE

activo BOOLEAN NOT NULL DEFAULT TRUE

Valores: efectivo, dinero electrónico, depósito bancario, tarjeta de débito, tarjeta de crédito, transferencia bancaria y cheque.

### `centro_formas_pago`

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL

forma\_pago\_id BIGINT (FK → formas\_pago.id) NOT NULL

UNIQUE (centro\_turistico\_id, forma\_pago\_id)

### `meses`

id SMALLINT (PK)

numero SMALLINT NOT NULL UNIQUE

nombre VARCHAR(20) NOT NULL UNIQUE

CHECK (numero BETWEEN 1 AND 12\)

### `centro_meses_recomendados`

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL

mes\_id SMALLINT (FK → meses.id) NOT NULL

motivo TEXT NULL

UNIQUE (centro\_turistico\_id, mes\_id)

**Cardinalidades:**

centros\_turisticos 1:1 ingresos\_centro\_turistico

centros\_turisticos N:M formas\_pago

centros\_turisticos N:M meses

---

# 4\. Accesibilidad y conectividad

## 4.1 Ciudad o poblado más cercano

### `centro_localidad_cercana`

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL

localidad\_id BIGINT (FK → localidades.id) NOT NULL

distancia\_km NUMERIC(8,2) NULL

tiempo\_desplazamiento INTERVAL NULL

observacion TEXT NULL

created\_at TIMESTAMPTZ NOT NULL

updated\_at TIMESTAMPTZ NOT NULL

UNIQUE (centro\_turistico\_id)

&nbsp;

## 4.2 Vías de acceso

### Catálogos

estados\_condicion:

id (PK), codigo, nombre, activo

Valores: BUENO, REGULAR, MALO.

&nbsp;

tipos\_via\_terrestre:

id (PK), codigo, nombre, activo

Valores: PRIMER\_ORDEN, SEGUNDO\_ORDEN, TERCER\_ORDEN.

&nbsp;

materiales\_via:

id (PK), codigo, nombre, activo

&nbsp;

modalidades\_acceso\_acuatico:

id (PK), codigo, nombre, activo

Valores: MARITIMO, LACUSTRE, FLUVIAL.

&nbsp;

coberturas\_acceso\_aereo:

id (PK), codigo, nombre, activo

Valores: NACIONAL, INTERNACIONAL.

### `vias_acceso_terrestre`

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL

tipo\_via\_terrestre\_id BIGINT (FK → tipos\_via\_terrestre.id) NOT NULL

latitud\_inicio NUMERIC(9,6) NULL

longitud\_inicio NUMERIC(10,6) NULL

latitud\_fin NUMERIC(9,6) NULL

longitud\_fin NUMERIC(10,6) NULL

distancia\_km NUMERIC(8,2) NULL

material\_via\_id BIGINT (FK → materiales\_via.id) NULL

estado\_condicion\_id BIGINT (FK → estados\_condicion.id) NULL

observacion TEXT NULL

created\_at TIMESTAMPTZ NOT NULL

updated\_at TIMESTAMPTZ NOT NULL

### `accesos_acuaticos`

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL

modalidad\_acceso\_acuatico\_id BIGINT (FK → modalidades\_acceso\_acuatico.id) NOT NULL

puerto\_embarque VARCHAR(180) NULL

estado\_puerto\_embarque\_id BIGINT (FK → estados\_condicion.id) NULL

puerto\_llegada VARCHAR(180) NULL

estado\_puerto\_llegada\_id BIGINT (FK → estados\_condicion.id) NULL

observacion TEXT NULL

created\_at TIMESTAMPTZ NOT NULL

updated\_at TIMESTAMPTZ NOT NULL

### `accesos_aereos`

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL

cobertura\_acceso\_aereo\_id BIGINT (FK → coberturas\_acceso\_aereo.id) NOT NULL

observacion TEXT NULL

created\_at TIMESTAMPTZ NOT NULL

updated\_at TIMESTAMPTZ NOT NULL

Cada fila representa una alternativa real de acceso. No se guardan columnas vacías para modalidades que no apliquen.

## 4.3 Servicio de transporte

### `tipos_transporte`

id BIGINT (PK)

codigo VARCHAR(30) NOT NULL UNIQUE

nombre VARCHAR(80) NOT NULL UNIQUE

activo BOOLEAN NOT NULL DEFAULT TRUE

Valores de la ficha: bus, buseta, vehículo 4x4, taxi, mototaxi, teleférico, lancha, bote, barco, canoa, avión, avioneta, helicóptero y otro.

### `frecuencias_servicio`

id BIGINT (PK)

codigo VARCHAR(20) NOT NULL UNIQUE

nombre VARCHAR(40) NOT NULL UNIQUE

activo BOOLEAN NOT NULL DEFAULT TRUE

Valores: diario, semanal, mensual y eventual.

### `transporte_centro`

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL UNIQUE

detalle\_otro VARCHAR(180) NULL

observacion TEXT NULL

### `centro_tipos_transporte`

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL

tipo\_transporte\_id BIGINT (FK → tipos\_transporte.id) NOT NULL

UNIQUE (centro\_turistico\_id, tipo\_transporte\_id)

### `detalles_transporte`

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL

operador\_cooperativa VARCHAR(180) NOT NULL

estacion\_terminal VARCHAR(180) NULL

frecuencia\_servicio\_id BIGINT (FK → frecuencias\_servicio.id) NULL

detalle\_traslado TEXT NULL

observacion TEXT NULL

created\_at TIMESTAMPTZ NOT NULL

updated\_at TIMESTAMPTZ NOT NULL

La ficha no relaciona cada cooperativa con una casilla concreta de tipo de transporte; por eso los tipos seleccionados y el detalle de operadores se almacenan por separado, sin inventar esa relación.

## `cooperativas_transporte`

**Contexto:** registra las cooperativas o asociaciones que prestan servicios de transporte.

id BIGINT (PK)

nombre VARCHAR(180) NOT NULL

ruc VARCHAR(13) NULL UNIQUE

telefono VARCHAR(25) NULL

email VARCHAR(254) NULL

direccion TEXT NULL

activo BOOLEAN NOT NULL DEFAULT TRUE

created\_at TIMESTAMPTZ NOT NULL

updated\_at TIMESTAMPTZ NOT NULL

## `rutas_transporte`

**Contexto:** registra los recorridos ofrecidos por una cooperativa y el tipo de transporte utilizado.

id BIGINT (PK)

cooperativa\_id BIGINT

(FK → cooperativas\_transporte.id) NOT NULL

tipo\_transporte\_id BIGINT

(FK → tipos\_transporte.id) NOT NULL

nombre VARCHAR(180) NOT NULL

origen VARCHAR(180) NOT NULL

destino VARCHAR(180) NOT NULL

precio NUMERIC(10,2) NULL

duracion\_estimada INTERVAL NULL

activo BOOLEAN NOT NULL DEFAULT TRUE

created\_at TIMESTAMPTZ NOT NULL

updated\_at TIMESTAMPTZ NOT NULL

## `paradas_transporte`

**Contexto:** almacena los lugares georreferenciados donde se detiene un servicio de transporte.

id BIGINT (PK)

nombre VARCHAR(180) NOT NULL

latitud NUMERIC(9,6) NOT NULL

longitud NUMERIC(10,6) NOT NULL

direccion\_referencia TEXT NULL

activo BOOLEAN NOT NULL DEFAULT TRUE

created\_at TIMESTAMPTZ NOT NULL

updated\_at TIMESTAMPTZ NOT NULL

## `ruta_paradas`

**Contexto:** relaciona una ruta con sus paradas y conserva el orden en el que se recorren.

id BIGINT (PK)

ruta\_transporte\_id BIGINT

(FK → rutas\_transporte.id) NOT NULL

parada\_transporte\_id BIGINT

(FK → paradas\_transporte.id) NOT NULL

orden SMALLINT NOT NULL

tiempo\_estimado\_desde\_origen INTERVAL NULL

UNIQUE (ruta\_transporte\_id, parada\_transporte\_id)

UNIQUE (ruta\_transporte\_id, orden)

## `horarios_ruta`

**Contexto:** registra los días y horas en los que opera una ruta de transporte.

id BIGINT (PK)

ruta\_transporte\_id BIGINT

(FK → rutas\_transporte.id) NOT NULL

dia\_semana SMALLINT NOT NULL

hora\_salida TIME NOT NULL

hora\_llegada TIME NULL

activo BOOLEAN NOT NULL DEFAULT TRUE

CHECK (dia\_semana BETWEEN 1 AND 7\)

Convención para `dia_semana`:

1 \= lunes

2 \= martes

3 \= miércoles

4 \= jueves

5 \= viernes

6 \= sábado

7 \= domingo

## `centro_rutas_transporte`

**Contexto:** indica qué rutas permiten llegar a un centro turístico y cuál es la parada recomendada para el visitante.

id BIGINT (PK)

centro\_turistico\_id BIGINT

(FK → centros\_turisticos.id) NOT NULL

ruta\_transporte\_id BIGINT

(FK → rutas\_transporte.id) NOT NULL

parada\_recomendada\_id BIGINT

(FK → paradas\_transporte.id) NULL

indicacion\_llegada TEXT NULL

UNIQUE (centro\_turistico\_id, ruta\_transporte\_id)

**Cardinalidades:**

cooperativas\_transporte 1:N rutas\_transporte

tipos\_transporte 1:N rutas\_transporte

rutas\_transporte N:M paradas\_transporte mediante ruta\_paradas

rutas\_transporte 1:N horarios\_ruta

centros\_turisticos N:M rutas\_transporte mediante centro\_rutas\_transporte

&nbsp;

&nbsp;

## 4.4 Condiciones de accesibilidad

### `tipos_accesibilidad`

id BIGINT (PK)

codigo VARCHAR(30) NOT NULL UNIQUE

nombre VARCHAR(100) NOT NULL UNIQUE

activo BOOLEAN NOT NULL DEFAULT TRUE

Valores: general, física, visual, auditiva, intelectual/psicosocial y no accesible.

### `centro_accesibilidad_resumen`

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL

tipo\_accesibilidad\_id BIGINT (FK → tipos\_accesibilidad.id) NOT NULL

aplica BOOLEAN NOT NULL

observacion TEXT NULL

UNIQUE (centro\_turistico\_id, tipo\_accesibilidad\_id)

### `criterios_accesibilidad`

id BIGINT (PK)

tipo\_accesibilidad\_id BIGINT (FK → tipos\_accesibilidad.id) NOT NULL

codigo VARCHAR(30) NOT NULL UNIQUE

descripcion TEXT NOT NULL

orden SMALLINT NOT NULL

activo BOOLEAN NOT NULL DEFAULT TRUE

Los registros del catálogo son exactamente los criterios enumerados en la hoja `ficha_Accesibilidad`:

- General: estacionamiento; estacionamiento para personas con discapacidad; rampas externas; gradas externas; vías peatonales; señalética informativa, direccional y preventiva; puertas automáticas; ascensor; recepción; puntos de concentración turística; baños comunales/sociales; indicador de baño libre/ocupado.
- Discapacidad física: rampas; pasamanos; recepción adaptada; baños adaptados; espacio de maniobra de 1,50 m; barras de apoyo; sistema de asistencia; espejo; grifería accesible; lavabo sin pedestal; accesorios de limpieza a altura accesible; puntos de concentración accesibles; salvaescaleras; vías peatonales accesibles.
- Discapacidad visual: recepción con braille/JAWS/formatos accesibles; sensores de voz o bucle magnético; rotulación braille, alto relieve o plano háptico; pasamanos; baños adaptados; espacio de maniobra; grifería accesible; bandas podotáctiles o contraste; sistema de asistencia; puntos con información autodescriptiva, braille o audio; maquetas táctiles; vías peatonales con bandas podotáctiles.
- Discapacidad auditiva: recepción con registros ilustrados, lengua de señas, personal capacitado, pantallas o subtitulado; alarmas visuales; rotulación visual; baños adaptados; sistema de asistencia; puntos con información gráfica o audiovisual; vías peatonales con rotulación e ilustraciones.
- Discapacidad intelectual o psicosocial: recepción con personal capacitado; accesibilidad cognitiva; sistema de asistencia en baño; puntos con información gráfica/audiovisual y guías capacitados.

### `respuestas_accesibilidad`

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL

criterio\_accesibilidad\_id BIGINT (FK → criterios\_accesibilidad.id) NOT NULL

cumple BOOLEAN NULL

detalle TEXT NULL

observacion TEXT NULL

UNIQUE (centro\_turistico\_id, criterio\_accesibilidad\_id)

## 4.5 Señalización de aproximación

### `senalizaciones_aproximacion`

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL UNIQUE

disponible BOOLEAN NOT NULL

estado\_condicion\_id BIGINT (FK → estados\_condicion.id) NULL

observacion TEXT NULL

created\_at TIMESTAMPTZ NOT NULL

updated\_at TIMESTAMPTZ NOT NULL

&nbsp;

**Cardinalidades:**

centros\_turisticos 1:1 centro\_localidad\_cercana

localidades 1:N centro\_localidad\_cercana

---

# 5\. Planta turística y servicios complementarios

## 5.1 Planta turística

### `ambitos_ubicacion_servicio`

id BIGINT (PK)

codigo VARCHAR(30) NOT NULL UNIQUE

nombre VARCHAR(100) NOT NULL UNIQUE

activo BOOLEAN NOT NULL DEFAULT TRUE

Valores: `EN_ATRACTIVO` y `EN_POBLADO_CERCANO`.

### `tipos_planta_turistica`

id BIGINT (PK)

grupo VARCHAR(30) NOT NULL

codigo VARCHAR(40) NOT NULL UNIQUE

nombre VARCHAR(120) NOT NULL

unidad\_1 VARCHAR(30) NOT NULL

unidad\_2 VARCHAR(30) NULL

unidad\_3 VARCHAR(30) NULL

activo BOOLEAN NOT NULL DEFAULT TRUE

Grupos y tipos de la ficha:

- Alojamiento: hotel, hostal, hostería, hacienda turística, lodge, resort, refugio, campamento turístico y casa de huéspedes; unidades establecimientos, habitaciones y plazas.
- Alimentos y bebidas: restaurantes, cafeterías, bares y fuentes de soda; unidades establecimientos, mesas y plazas.
- Agencias de viaje: mayorista, internacional y operadora; unidad establecimientos.
- Guías: local, nacional, nacional especializado en cultura y nacional especializado en aventura; unidad personas.

### `planta_turistica_centro`

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL

ambito\_ubicacion\_servicio\_id BIGINT (FK → ambitos\_ubicacion\_servicio.id) NOT NULL

tipo\_planta\_turistica\_id BIGINT (FK → tipos\_planta\_turistica.id) NOT NULL

cantidad\_1 INTEGER NULL

cantidad\_2 INTEGER NULL

cantidad\_3 INTEGER NULL

observacion TEXT NULL

UNIQUE (centro\_turistico\_id, ambito\_ubicacion\_servicio\_id, tipo\_planta\_turistica\_id)

## 5.2 Facilidades en el entorno

### `categorias_facilidad`

id BIGINT (PK)

codigo VARCHAR(30) NOT NULL UNIQUE

nombre VARCHAR(100) NOT NULL UNIQUE

activo BOOLEAN NOT NULL DEFAULT TRUE

Valores: apoyo a la gestión, observación/vigilancia, recorrido/descanso, servicio y otros.

### `tipos_facilidad`

id BIGINT (PK)

categoria\_facilidad\_id BIGINT (FK → categorias\_facilidad.id) NOT NULL

codigo VARCHAR(40) NOT NULL UNIQUE

nombre VARCHAR(140) NOT NULL

activo BOOLEAN NOT NULL DEFAULT TRUE

Valores de la ficha: punto de información, I-Tur, centro de interpretación, centro de facilitación, centro de recepción de visitantes, garitas, miradores, torres de avistamiento de aves, torres de salvavidas, senderos, estaciones de sombra y descanso, áreas de acampar, refugio de montaña, baterías sanitarias, estacionamientos y otro.

### `facilidades_centro`

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL

tipo\_facilidad\_id BIGINT (FK → tipos\_facilidad.id) NOT NULL

cantidad SMALLINT NOT NULL DEFAULT 1

latitud NUMERIC(9,6) NULL

longitud NUMERIC(10,6) NULL

administrador VARCHAR(180) NULL

accesibilidad\_universal BOOLEAN NULL

estado\_condicion\_id BIGINT (FK → estados\_condicion.id) NULL

detalle\_otro VARCHAR(180) NULL

observacion TEXT NULL

created\_at TIMESTAMPTZ NOT NULL

updated\_at TIMESTAMPTZ NOT NULL

## 5.3 Servicios complementarios

### `tipos_servicio_complementario`

id BIGINT (PK)

codigo VARCHAR(40) NOT NULL UNIQUE

nombre VARCHAR(140) NOT NULL UNIQUE

activo BOOLEAN NOT NULL DEFAULT TRUE

Valores: alquiler/venta de equipos, venta de artesanías o mercancías, casa de cambio, cajero automático y otro.

### `servicios_complementarios_centro`

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL

ambito\_ubicacion\_servicio\_id BIGINT (FK → ambitos\_ubicacion\_servicio.id) NOT NULL

tipo\_servicio\_complementario\_id BIGINT (FK → tipos\_servicio\_complementario.id) NOT NULL

especificacion VARCHAR(250) NULL

observacion TEXT NULL

UNIQUE (centro\_turistico\_id, ambito\_ubicacion\_servicio\_id, tipo\_servicio\_complementario\_id, especificacion)

---

# 6\. Estado de conservación e integración del atractivo y su entorno

## 6.1–6.2 Evaluación del atractivo y del entorno

### `estados_conservacion`

id BIGINT (PK)

codigo VARCHAR(30) NOT NULL UNIQUE

nombre VARCHAR(80) NOT NULL UNIQUE

activo BOOLEAN NOT NULL DEFAULT TRUE

Valores: conservado, alterado, en proceso de deterioro y deteriorado.

### `componentes_conservacion`

id SMALLINT (PK)

codigo VARCHAR(20) NOT NULL UNIQUE

nombre VARCHAR(50) NOT NULL UNIQUE

Valores: atractivo y entorno.

### `evaluaciones_conservacion`

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL

componente\_conservacion\_id SMALLINT (FK → componentes\_conservacion.id) NOT NULL

estado\_conservacion\_id BIGINT (FK → estados\_conservacion.id) NOT NULL

observacion TEXT NULL

created\_at TIMESTAMPTZ NOT NULL

updated\_at TIMESTAMPTZ NOT NULL

UNIQUE (centro\_turistico\_id, componente\_conservacion\_id)

### `factores_alteracion`

id BIGINT (PK)

origen VARCHAR(20) NOT NULL

codigo VARCHAR(50) NOT NULL UNIQUE

nombre VARCHAR(180) NOT NULL

activo BOOLEAN NOT NULL DEFAULT TRUE

CHECK (origen IN ('NATURAL','ANTROPICO'))

Factores naturales: erosión, humedad, desastres naturales, flora/fauna, clima y otro. Factores antrópicos: actividades agrícolas/ganaderas, forestales, industriales, negligencia/abandono, minería/extracción, huaquería, conflicto de tenencia, condiciones de uso/exposición, falta de mantenimiento, contaminación, generación de residuos, expansión urbana, conflicto político/social, desarrollo industrial/comercial, vandalismo y otro.

### `evaluacion_factores_alteracion`

id BIGINT (PK)

evaluacion\_conservacion\_id BIGINT (FK → evaluaciones\_conservacion.id) NOT NULL

factor\_alteracion\_id BIGINT (FK → factores\_alteracion.id) NOT NULL

presente BOOLEAN NOT NULL

detalle\_otro VARCHAR(180) NULL

observacion TEXT NULL

UNIQUE (evaluacion\_conservacion\_id, factor\_alteracion\_id)

## 6.3 Declaratoria del espacio turístico

### `declaratorias_turisticas`

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL

entidad\_declarante VARCHAR(180) NOT NULL

denominacion VARCHAR(250) NOT NULL

fecha\_declaratoria DATE NULL

ambito VARCHAR(120) NULL

observacion TEXT NULL

created\_at TIMESTAMPTZ NOT NULL

updated\_at TIMESTAMPTZ NOT NULL

---

# 7\. Higiene y seguridad turística

## 7.1 Servicios básicos

### `categorias_servicio_basico`

id BIGINT (PK)

codigo VARCHAR(30) NOT NULL UNIQUE

nombre VARCHAR(80) NOT NULL UNIQUE

activo BOOLEAN NOT NULL DEFAULT TRUE

Valores: agua, energía eléctrica, saneamiento y disposición de desechos.

### `tipos_servicio_basico`

id BIGINT (PK)

categoria\_servicio\_basico\_id BIGINT (FK → categorias\_servicio\_basico.id) NOT NULL

codigo VARCHAR(40) NOT NULL UNIQUE

nombre VARCHAR(120) NOT NULL

activo BOOLEAN NOT NULL DEFAULT TRUE

- Agua: potable, pozo, tanquero, entubada, río/vertiente, lluvia y otro.
- Energía: red pública, panel solar, generador y otro.
- Saneamiento: red pública, pozo séptico, pozo ciego, descarga directa, letrina y otro.
- Desechos: carro recolector, terreno baldío/quebrada, quema, entierra, río/canal y otro.

### `servicios_basicos_centro`

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL

ambito\_ubicacion\_servicio\_id BIGINT (FK → ambitos\_ubicacion\_servicio.id) NOT NULL

tipo\_servicio\_basico\_id BIGINT (FK → tipos\_servicio\_basico.id) NOT NULL

proveedor VARCHAR(180) NULL

especificacion VARCHAR(250) NULL

observacion TEXT NULL

UNIQUE (centro\_turistico\_id, ambito\_ubicacion\_servicio\_id, tipo\_servicio\_basico\_id)

## 7.2 Señalética en el atractivo

### `tipos_senaletica`

id BIGINT (PK)

ambiente VARCHAR(30) NOT NULL

codigo VARCHAR(50) NOT NULL UNIQUE

nombre VARCHAR(180) NOT NULL

activo BOOLEAN NOT NULL DEFAULT TRUE

`ambiente` conserva la agrupación de la ficha: urbana, natural, informativa y seguridad.

Valores exactos del catálogo:

- Áreas urbanas: pictograma de atractivos naturales, atractivos culturales, actividades turísticas, servicios de apoyo y restricción; tótem de atractivos turísticos, de sitio y direccional.
- Áreas naturales: los cinco pictogramas anteriores; señales turísticas de aproximación; paneles de direccionamiento hacia atractivos; panel informativo de atractivos; panel informativo de direccionamiento hacia atractivos, servicios y actividades; mesas interpretativas; tótem de sitio y de direccionamiento.
- Letreros informativos: información botánica y normativos de concienciación.
- Señalética interna de seguridad: protección de los elementos del atractivo.
- Otros: conserva su especificación en `senaletica_centro.detalle`.

### `materiales_senaletica`

id BIGINT (PK)

codigo VARCHAR(20) NOT NULL UNIQUE

nombre VARCHAR(60) NOT NULL UNIQUE

activo BOOLEAN NOT NULL DEFAULT TRUE

Valores: madera, aluminio y otro.

### `senaletica_centro`

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL

tipo\_senaletica\_id BIGINT (FK → tipos\_senaletica.id) NOT NULL

material\_senaletica\_id BIGINT (FK → materiales\_senaletica.id) NULL

cantidad SMALLINT NULL

estado\_condicion\_id BIGINT (FK → estados\_condicion.id) NULL

detalle VARCHAR(250) NULL

observacion TEXT NULL

created\_at TIMESTAMPTZ NOT NULL

updated\_at TIMESTAMPTZ NOT NULL

## 7.3 Salud

### `tipos_servicio_salud`

id BIGINT (PK)

codigo VARCHAR(30) NOT NULL UNIQUE

nombre VARCHAR(100) NOT NULL UNIQUE

activo BOOLEAN NOT NULL DEFAULT TRUE

Valores: hospital/clínica, centro de salud, dispensario médico, botiquín de primeros auxilios y otro.

### `servicios_salud_centro`

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL

ambito\_ubicacion\_servicio\_id BIGINT (FK → ambitos\_ubicacion\_servicio.id) NOT NULL

tipo\_servicio\_salud\_id BIGINT (FK → tipos\_servicio\_salud.id) NOT NULL

cantidad SMALLINT NULL

detalle\_otro VARCHAR(180) NULL

observacion TEXT NULL

## 7.4 Seguridad

### `tipos_servicio_seguridad`

id BIGINT (PK)

codigo VARCHAR(30) NOT NULL UNIQUE

nombre VARCHAR(100) NOT NULL UNIQUE

activo BOOLEAN NOT NULL DEFAULT TRUE

Valores: seguridad privada, Policía Nacional, policía municipal/metropolitana y otro.

### `servicios_seguridad_centro`

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL

tipo\_servicio\_seguridad\_id BIGINT (FK → tipos\_servicio\_seguridad.id) NOT NULL

detalle VARCHAR(250) NULL

observacion TEXT NULL

## 7.5 Comunicación de uso público

### `tipos_comunicacion`

id BIGINT (PK)

grupo VARCHAR(20) NOT NULL

codigo VARCHAR(40) NOT NULL UNIQUE

nombre VARCHAR(100) NOT NULL

activo BOOLEAN NOT NULL DEFAULT TRUE

Telefonía: fija, móvil y satelital. Internet: línea fija, fibra óptica, satelital, red móvil e inalámbrica.

### `comunicaciones_centro`

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL

ambito\_ubicacion\_servicio\_id BIGINT (FK → ambitos\_ubicacion\_servicio.id) NOT NULL

tipo\_comunicacion\_id BIGINT (FK → tipos\_comunicacion.id) NOT NULL

observacion TEXT NULL

UNIQUE (centro\_turistico\_id, ambito\_ubicacion\_servicio\_id, tipo\_comunicacion\_id)

### `radios_portatiles_centro`

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL UNIQUE

disponible BOOLEAN NOT NULL

uso\_visitantes BOOLEAN NOT NULL DEFAULT FALSE

uso\_interno BOOLEAN NOT NULL DEFAULT FALSE

uso\_emergencias BOOLEAN NOT NULL DEFAULT FALSE

cantidad SMALLINT NULL

observacion TEXT NULL

## 7.6 Multiamenazas

### `tipos_amenaza`

id BIGINT (PK)

codigo VARCHAR(30) NOT NULL UNIQUE

nombre VARCHAR(100) NOT NULL UNIQUE

activo BOOLEAN NOT NULL DEFAULT TRUE

Valores exactos de la ficha: deslaves, sismos, erupciones volcánicas, incendios forestales, sequía, inundaciones, aguajes y tsunami.

### `amenazas_centro`

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL

tipo\_amenaza\_id BIGINT (FK → tipos\_amenaza.id) NOT NULL

presente BOOLEAN NOT NULL

observacion TEXT NULL

UNIQUE (centro\_turistico\_id, tipo\_amenaza\_id)

### `planes_contingencia`

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL

existe BOOLEAN NOT NULL

institucion\_responsable VARCHAR(180) NULL

nombre\_documento VARCHAR(250) NULL

anio SMALLINT NULL

archivo\_id BIGINT (FK → archivos\_centro\_turistico.id) NULL

observacion TEXT NULL

created\_at TIMESTAMPTZ NOT NULL

updated\_at TIMESTAMPTZ NOT NULL

---

# 8\. Políticas y regulaciones

### `preguntas_politica`

id BIGINT (PK)

codigo VARCHAR(30) NOT NULL UNIQUE

pregunta TEXT NOT NULL

orden SMALLINT NOT NULL UNIQUE

activo BOOLEAN NOT NULL DEFAULT TRUE

Las cuatro preguntas de la ficha se cargan como catálogo: plan de desarrollo turístico del GAD, inclusión del atractivo en la planificación territorial, regulaciones aplicables y ordenanzas aplicables.

### `respuestas_politica_centro`

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL

pregunta\_politica\_id BIGINT (FK → preguntas\_politica.id) NOT NULL

respuesta BOOLEAN NOT NULL

anio SMALLINT NULL

especificacion TEXT NULL

observacion TEXT NULL

UNIQUE (centro\_turistico\_id, pregunta\_politica\_id)

---

# 9\. Actividades que se practican

### `grupos_actividad`

id BIGINT (PK)

categoria\_atractivo\_id BIGINT (FK → categorias\_atractivo.id) NOT NULL

codigo VARCHAR(30) NOT NULL UNIQUE

nombre VARCHAR(100) NOT NULL

activo BOOLEAN NOT NULL DEFAULT TRUE

Para atractivos naturales: agua, aire y tierra. Para manifestaciones culturales: actividades culturales.

### `actividades_turisticas`

id BIGINT (PK)

grupo\_actividad\_id BIGINT (FK → grupos\_actividad.id) NOT NULL

codigo VARCHAR(50) NOT NULL UNIQUE

nombre VARCHAR(180) NOT NULL

activo BOOLEAN NOT NULL DEFAULT TRUE

Catálogo natural de la ficha:

- Agua: buceo, kayak de mar, kayak lacustre, kayak de río, surf, kite surf, rafting, snorkel, tubing, regata, paseo en panga, bote, lancha, moto acuática, parasailing, esquí acuático, banana, boya, pesca deportiva y otro.
- Aire: ala delta, canopy, parapente y otro.
- Tierra: montañismo, escalada, senderismo, cicloturismo, canyoning, exploración de cuevas, actividades recreativas, cabalgata, caminata, camping, picnic, observación de flora/fauna, observación de astros y otro.

Catálogo cultural: recorridos guiados y autoguiados, visita/participación en talleres artísticos o artesanales, exposiciones, exhibición de piezas, actividades vivenciales/lúdicas, presentaciones en vivo, muestras audiovisuales, fotografía, degustación de platos tradicionales, participación en celebraciones, compra de artesanías, convivencia, medicina ancestral y otro.

### `actividades_centro_turistico`

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL

actividad\_turistica\_id BIGINT (FK → actividades\_turisticas.id) NOT NULL

activo BOOLEAN NOT NULL

detalle\_otro VARCHAR(180) NULL

observacion TEXT NULL

UNIQUE (centro\_turistico\_id, actividad\_turistica\_id)

La aplicación debe permitir únicamente actividades cuya categoría coincida con la categoría del centro.

---

# 10\. Promoción y comercialización

### `promocion_centro_turistico`

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL UNIQUE

tiene\_plan\_promocion BOOLEAN NOT NULL

nombre\_plan VARCHAR(250) NULL

incluido\_en\_plan BOOLEAN NULL

forma\_parte\_paquete BOOLEAN NOT NULL

detalle\_paquete TEXT NULL

observacion TEXT NULL

created\_at TIMESTAMPTZ NOT NULL

updated\_at TIMESTAMPTZ NOT NULL

### `tipos_medio_promocion`

id BIGINT (PK)

codigo VARCHAR(40) NOT NULL UNIQUE

nombre VARCHAR(140) NOT NULL UNIQUE

activo BOOLEAN NOT NULL DEFAULT TRUE

Valores: página web, red social, revista especializada, material POP, oficina de turismo, medio de comunicación, feria y otro.

### `medios_promocion_centro_turistico`

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL

tipo\_medio\_promocion\_id BIGINT (FK → tipos\_medio\_promocion.id) NOT NULL

nombre VARCHAR(180) NULL

url VARCHAR(500) NULL

periodicidad VARCHAR(100) NULL

detalle\_otro VARCHAR(180) NULL

observacion TEXT NULL

created\_at TIMESTAMPTZ NOT NULL

updated\_at TIMESTAMPTZ NOT NULL

---

# 11\. Registro de visitantes y afluencia

## 11.1 Registro y estadísticas

### `registros_visitantes`

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL UNIQUE

existe\_registro BOOLEAN NOT NULL

tipo\_registro VARCHAR(20) NULL

anios\_registro SMALLINT NULL

genera\_reportes BOOLEAN NOT NULL DEFAULT FALSE

frecuencia\_reporte VARCHAR(80) NULL

observacion TEXT NULL

CHECK (tipo\_registro IS NULL OR tipo\_registro IN ('DIGITAL','PAPEL'))

### `temporadas_visitacion`

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL

tipo\_temporada VARCHAR(10) NOT NULL

cantidad\_visitantes INTEGER NULL

anio SMALLINT NULL

observacion TEXT NULL

CHECK (tipo\_temporada IN ('ALTA','BAJA'))

UNIQUE (centro\_turistico\_id, tipo\_temporada, anio)

### `temporada_meses`

id BIGINT (PK)

temporada\_visitacion\_id BIGINT (FK → temporadas\_visitacion.id) NOT NULL

mes\_id SMALLINT (FK → meses.id) NOT NULL

UNIQUE (temporada\_visitacion\_id, mes\_id)

### `procedencias_visitantes`

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL

tipo\_procedencia VARCHAR(15) NOT NULL

lugar VARCHAR(150) NOT NULL

mes\_id SMALLINT (FK → meses.id) NULL

anio SMALLINT NULL

cantidad\_visitantes INTEGER NULL

observacion TEXT NULL

CHECK (tipo\_procedencia IN ('NACIONAL','EXTRANJERA'))

Para procedencia nacional, `lugar` registra la ciudad; para la extranjera, el país.

## 11.2 Informante clave y demanda

### `informantes_clave`

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL

nombre VARCHAR(180) NOT NULL

contacto VARCHAR(120) NULL

observacion TEXT NULL

### `afluencia_visitantes`

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL UNIQUE

cantidad\_entre\_semana INTEGER NULL

cantidad\_fin\_semana INTEGER NULL

cantidad\_feriados INTEGER NULL

frecuencia\_demanda VARCHAR(20) NULL

observacion TEXT NULL

CHECK (frecuencia\_demanda IS NULL OR frecuencia\_demanda IN ('PERMANENTE','ESTACIONAL','ESPORADICA','INEXISTENTE'))

---

# 12\. Recurso humano

### `resumen_recurso_humano`

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL UNIQUE

personas\_administracion\_operacion INTEGER NULL

personal\_especializado\_turismo INTEGER NULL

observacion TEXT NULL

### `tipos_formacion_personal`

id BIGINT (PK)

grupo VARCHAR(20) NOT NULL

codigo VARCHAR(40) NOT NULL UNIQUE

nombre VARCHAR(140) NOT NULL

activo BOOLEAN NOT NULL DEFAULT TRUE

Grupos y opciones:

- Educación: primaria, secundaria, tercer nivel, cuarto nivel y otro.
- Capacitación: primeros auxilios, hospitalidad, atención al cliente, guianza, sensibilización sobre discapacidad y otro.
- Idioma: inglés, alemán, francés, italiano, chino y otro.

### `formacion_personal_centro`

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL

tipo\_formacion\_personal\_id BIGINT (FK → tipos\_formacion\_personal.id) NOT NULL

cantidad\_personas INTEGER NOT NULL DEFAULT 0

detalle\_otro VARCHAR(180) NULL

observacion TEXT NULL

UNIQUE (centro\_turistico\_id, tipo\_formacion\_personal\_id)

---

# 13\. Descripción del atractivo

La descripción está en `centros_turisticos.descripcion` y conserva el límite de 500 caracteres de la validación del XLSM. No necesita una tabla independiente porque existe una sola descripción principal por centro.

---

# 14\. Anexos y responsables

## 14.1 Archivos, fotografías y mapa

### `tipos_archivo_centro_turistico`

id BIGINT (PK)

codigo VARCHAR(30) NOT NULL UNIQUE

nombre VARCHAR(80) NOT NULL UNIQUE

activo BOOLEAN NOT NULL DEFAULT TRUE

Valores: fotografía, mapa, plan de contingencia y otro anexo.

### `archivos_centro_turistico`

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL

tipo\_archivo\_centro\_id BIGINT (FK → tipos\_archivo\_centro\_turistico.id) NOT NULL

nombre\_original VARCHAR(255) NOT NULL

ruta\_archivo TEXT NOT NULL

proveedor\_almacenamiento VARCHAR(30) NOT NULL

checksum\_sha256 CHAR(64) NULL

mime\_type VARCHAR(100) NOT NULL

tamano\_bytes BIGINT NULL

fuente\_autor VARCHAR(250) NULL

descripcion TEXT NULL

latitud NUMERIC(9,6) NULL

longitud NUMERIC(10,6) NULL

orden SMALLINT NULL

observacion TEXT NULL

created\_at TIMESTAMPTZ NOT NULL

updated\_at TIMESTAMPTZ NOT NULL

Las dos fotografías en alta resolución son dos filas con tipo `FOTOGRAFIA`; el mapa es una fila con tipo `MAPA`. Así no se limita el sistema a un número fijo de anexos.

El contenido binario no se guarda en PostgreSQL. `ruta_archivo` contiene una ruta o URL del almacenamiento externo y `proveedor_almacenamiento` identifica el medio utilizado, por ejemplo `LOCAL`, `S3` o `CLOUDINARY`. `checksum_sha256` permite comprobar la integridad y detectar archivos duplicados. La eliminación lógica del centro no elimina sus archivos; cualquier depuración física requiere un proceso administrativo independiente y auditable.

## 14.2 Elaboración, validación y aprobación

### `tipos_responsabilidad_ficha`

id BIGINT (PK)

codigo VARCHAR(20) NOT NULL UNIQUE

nombre VARCHAR(60) NOT NULL UNIQUE

Valores: elaboró, validó y aprobó.

### `responsables_ficha`

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL

tipo\_responsabilidad\_ficha\_id BIGINT (FK → tipos\_responsabilidad\_ficha.id) NOT NULL

nombre VARCHAR(180) NOT NULL

institucion VARCHAR(180) NULL

cargo VARCHAR(140) NULL

email VARCHAR(254) NULL

telefono VARCHAR(25) NULL

firma\_archivo\_id BIGINT (FK → archivos\_centro\_turistico.id) NULL

fecha DATE NULL

observacion TEXT NULL

UNIQUE (centro\_turistico\_id, tipo\_responsabilidad\_ficha\_id)

## 14.3 Levantamiento de accesibilidad

### `levantamientos_accesibilidad`

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL

fecha DATE NULL

hora\_inicio TIME NULL

hora\_fin TIME NULL

responsable\_nombre VARCHAR(180) NULL

responsable\_institucion VARCHAR(180) NULL

firma\_encuestado\_archivo\_id BIGINT (FK → archivos\_centro\_turistico.id) NULL

firma\_responsable\_archivo\_id BIGINT (FK → archivos\_centro\_turistico.id) NULL

observacion TEXT NULL

created\_at TIMESTAMPTZ NOT NULL

updated\_at TIMESTAMPTZ NOT NULL

## 14.4 Validación del GAD

### `validaciones_gad`

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL

nombre\_validador VARCHAR(180) NOT NULL

telefono VARCHAR(25) NULL

email VARCHAR(254) NULL

institucion VARCHAR(180) NOT NULL

cargo VARCHAR(140) NULL

fecha DATE NULL

firma\_archivo\_id BIGINT (FK → archivos\_centro\_turistico.id) NULL

acepta\_publicacion BOOLEAN NULL

observacion TEXT NULL

created\_at TIMESTAMPTZ NOT NULL

updated\_at TIMESTAMPTZ NOT NULL

# C. Valoración, jerarquía y fórmulas automáticas

Estas tablas conservan el resultado y también el detalle que lo produjo. Esto permite recalcular la ficha y explicar a la IA de dónde salió cada puntaje.

## `criterios_valoracion`

id BIGINT (PK)

codigo CHAR(1) NOT NULL UNIQUE

nombre VARCHAR(180) NOT NULL

puntaje\_maximo NUMERIC(5,2) NOT NULL

orden SMALLINT NOT NULL UNIQUE

activo BOOLEAN NOT NULL DEFAULT TRUE

Pesos encontrados en el XLSM:

| Código | Criterio                                         |  Máximo |
| :----- | :----------------------------------------------- | ------: |
| A      | Accesibilidad y conectividad                     |      18 |
| B      | Planta turística y servicios                     |      18 |
| C      | Estado de conservación e integración             |      14 |
| D      | Higiene y seguridad turística                    |      14 |
| E      | Políticas y regulaciones                         |      10 |
| F      | Actividades que se practican                     |       9 |
| G      | Difusión, medios de promoción y comercialización |       7 |
| H      | Registro de visitantes y afluencia               |       5 |
| I      | Recurso humano                                   |       5 |
|        | **Total**                                        | **100** |

## `indicadores_valoracion`

id BIGINT (PK)

criterio\_valoracion\_id BIGINT (FK → criterios\_valoracion.id) NOT NULL

codigo VARCHAR(20) NOT NULL UNIQUE

nombre TEXT NOT NULL

puntaje\_maximo NUMERIC(5,2) NOT NULL

regla\_calculo TEXT NOT NULL

orden SMALLINT NOT NULL

activo BOOLEAN NOT NULL DEFAULT TRUE

`regla_calculo` documenta la regla trasladada desde las fórmulas de las hojas `Jerarquia` y `Calculos`; no debe ejecutarse como texto. La lógica ejecutable se implementa en el servicio o función SQL de cálculo.

## `resultados_indicador`

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL

indicador\_valoracion\_id BIGINT (FK → indicadores\_valoracion.id) NOT NULL

valor\_base NUMERIC(8,2) NULL

puntaje\_obtenido NUMERIC(5,2) NOT NULL

detalle\_calculo JSONB NULL

observacion TEXT NULL

calculado\_at TIMESTAMPTZ NOT NULL

UNIQUE (centro\_turistico\_id, indicador\_valoracion\_id)

## `resultados_criterio`

id BIGINT (PK)

centro\_turistico\_id BIGINT (FK → centros\_turisticos.id) NOT NULL

criterio\_valoracion\_id BIGINT (FK → criterios\_valoracion.id) NOT NULL

puntaje\_obtenido NUMERIC(5,2) NOT NULL

puntaje\_maximo\_aplicado NUMERIC(5,2) NOT NULL

calculado\_at TIMESTAMPTZ NOT NULL

UNIQUE (centro\_turistico\_id, criterio\_valoracion\_id)

CHECK (puntaje\_obtenido BETWEEN 0 AND puntaje\_maximo\_aplicado)

El puntaje del criterio es:

LEAST(SUM(resultados\_indicador.puntaje\_obtenido), criterios\_valoracion.puntaje\_maximo)

El `puntaje_total` del centro es la suma de A a I y nunca puede superar 100\.

## `rangos_jerarquia`

id BIGINT (PK)

codigo CHAR(2) NOT NULL UNIQUE

nombre VARCHAR(30) NOT NULL UNIQUE

puntaje\_minimo NUMERIC(5,2) NOT NULL

puntaje\_maximo NUMERIC(5,2) NOT NULL

descripcion TEXT NULL

activo BOOLEAN NOT NULL DEFAULT TRUE

| Código | Jerarquía |                  Puntaje |
| :----- | :-------- | -----------------------: |
| `00`   | Recurso   |                     0–10 |
| `01`   | I         |  mayor que 10 y hasta 35 |
| `02`   | II        |  mayor que 35 y hasta 60 |
| `03`   | III       |  mayor que 60 y hasta 85 |
| `04`   | IV        | mayor que 85 y hasta 100 |

La `jerarquia_id` se selecciona automáticamente según `puntaje_total`.

## Regla particular de las vías de acceso

La hoja `Calculos` convierte el estado de cada vía así:

BUENO \= 3

REGULAR \= 2

MALO \= 1

Cada modalidad —terrestre, acuática o aérea— se normaliza a un máximo de 9\. Si existen varias modalidades aplicables, la fórmula utiliza el promedio de sus resultados. El detalle debe guardarse en `resultados_indicador.detalle_calculo` para que sea auditable.

## Corrección necesaria al trasladar las fórmulas

El XLSM permite que el criterio F sume hasta 18 aunque su máximo declarado es 9, y que H sume hasta 7 aunque su máximo es 5\. Además, un total superior a 100 queda fuera de los rangos de jerarquía. En la base se conserva la intención de la ficha y se aplica el tope de cada criterio con `LEAST(...)`; así el total siempre queda entre 0 y 100\.

El XLSM entregado (`Centro Cultural Indio Guaranga (2).xlsm`) muestra `48,7` en la celda
`Jerarquia!C1` y jerarquía `02`. Los valores `56,2/53,2` que aparecían en esta nota
pertenecen a una referencia anterior y no deben usarse como fixture del libro actual.

---

# D. Generación automática del código del atractivo

## Estructura de 17 caracteres

PP CC QQ CA TI ST JE NNN

| Parte | Longitud | Procedencia                                                    |
| :---- | -------: | :------------------------------------------------------------- |
| `PP`  |        2 | `provincias.codigo_dpa`                                        |
| `CC`  |        2 | `cantones.codigo_cton`                                         |
| `QQ`  |        2 | `parroquias.codigo_pqa`                                        |
| `CA`  |        2 | `categorias_atractivo.codigo`                                  |
| `TI`  |        2 | `tipos_atractivo.codigo`                                       |
| `ST`  |        2 | `subtipos_atractivo.codigo`                                    |
| `JE`  |        2 | `rangos_jerarquia.codigo`                                      |
| `NNN` |        3 | `centros_turisticos.secuencial_atractivo`, rellenado con ceros |

Fórmula lógica:

codigo\_atractivo \=

&nbsp;&nbsp;&nbsp;&nbsp;codigo\_provincia

&nbsp;|| codigo\_canton

&nbsp;|| codigo\_parroquia

&nbsp;|| codigo\_categoria

&nbsp;|| codigo\_tipo

&nbsp;|| codigo\_subtipo

&nbsp;|| codigo\_jerarquia

&nbsp;|| LPAD(secuencial\_atractivo, 3, '0')

El código completo **no es una entidad** y no requiere una tabla propia: identifica exactamente a una fila de `centros_turisticos`, y todas sus partes ya proceden de relaciones normalizadas.

## Cómo se genera `001`

En el XLSM, los tres últimos caracteres aparecen escritos como `001`; no existe una fórmula que busque el siguiente número. En el sistema sí deben generarse automáticamente:

1. Se inicia una transacción de PostgreSQL.
2. Se bloquea la fila de la parroquia correspondiente antes de consultar el consecutivo. El bloqueo serializa únicamente las altas de esa parroquia.
3. Se consulta el mayor `secuencial_atractivo` de la parroquia, incluyendo centros inactivos para no reutilizar códigos históricos.
4. El nuevo valor es `mayor + 1`; si no existe otro centro, es `1`. Si el resultado supera `999`, la operación se rechaza.
5. Se inserta el centro dentro de la misma transacción.
6. Se presenta con `LPAD(..., 3, '0')`: `1 → 001`, `2 → 002`, …, `999 → 999`.
7. La restricción `UNIQUE (parroquia_id, secuencial_atractivo)` actúa como última defensa frente a duplicados.

El usuario no escribe `001` a mano. `secuencial_atractivo` se almacena como número y los ceros se agregan únicamente al componer el código.

La jerarquía depende de la valoración. Por eso el sistema genera o actualiza `codigo_atractivo` después de recalcular `puntaje_total` y `jerarquia_id`. Si cambia la clasificación, ubicación o jerarquía, el código se recompone, pero el `id` interno del centro no cambia.

Para el archivo analizado:

02 03 53 MC 01 01 02 001

\= 020353MC010102001

## Sobre “número de levantamiento”

La ficha XLSM no contiene un campo independiente llamado `numero_levantamiento`. En el encabezado contiene `Código del atractivo`, y sus tres últimos caracteres corresponden al consecutivo del atractivo. Por eso el modelo usa `secuencial_atractivo`; no agrega un segundo número que duplicaría el mismo dato.

---

# E. Relaciones y reglas comunes

## Plataforma y datos geográficos

El motor seleccionado es **PostgreSQL** con la extensión **PostGIS**. Las columnas `latitud` y `longitud` se conservan por compatibilidad con formularios e importaciones, y las entidades georreferenciadas disponen además de una columna `ubicacion GEOGRAPHY(POINT, 4326)` derivada de ambas coordenadas. Un trigger mantiene `ubicacion` sincronizada en cada inserción o cambio de coordenadas.

La aplicación valida `latitud BETWEEN -90 AND 90` y `longitud BETWEEN -180 AND 180`. Durante la futura exportación se crearán índices espaciales `GIST` para centros turísticos, localidades, zonas turísticas, puntos de interés y establecimientos que tengan ubicación. Esto permitirá búsquedas por distancia, radio y cercanía.

## Relación principal

centros\_turisticos 1:N cada tabla de detalle operativo

centros\_turisticos 1:1 cada tabla de resumen que tenga UNIQUE (centro\_turistico\_id)

catálogos 1:N tablas operativas

## Reglas de integridad

- Las tablas de detalle nunca utilizan `ficha_id`; todas apuntan a `centros_turisticos.id`.
- Todas las FK usan `ON UPDATE CASCADE`.
- Las FK hacia catálogos y registros históricos usan `ON DELETE RESTRICT`.
- Las FK de detalles exclusivos usan `ON DELETE CASCADE` como protección de integridad, aunque la aplicación no ofrece eliminación física de centros.
- Las referencias opcionales, como `revisado_por`, usan `ON DELETE SET NULL`.
- Los catálogos se desactivan con `activo = FALSE`; no se eliminan si ya fueron utilizados.
- Los centros turísticos utilizan exclusivamente eliminación lógica: `activo = FALSE` y estado `INACTIVO`. Sus detalles, opiniones, archivos, resultados y auditoría se conservan.
- Los usuarios también se desactivan mediante `activo = FALSE` para preservar la autoría y la auditoría.
- Los campos “otro” conservan su especificación en `detalle_otro` o `especificacion`.
- Una respuesta negativa también se almacena cuando la ficha necesita distinguir “No” de “sin información”.
- Las observaciones son `TEXT`, pertenecen al mismo centro y deben incluirse al preparar el contexto para la IA.
- Los valores calculados se actualizan dentro de una transacción después de guardar toda la ficha.

## Índices requeridos

- PostgreSQL crea automáticamente los índices de las claves primarias y restricciones `UNIQUE`.
- Se agrega un índice B-tree individual a todas las claves foráneas que no estén cubiertas como primera columna de otro índice.
- Se crean índices compuestos según las consultas principales: estado y actividad de los centros, ubicación territorial, clasificación, fecha de publicación, moderación de opiniones y orden de rutas.
- Se crean índices `GIST` para las ubicaciones PostGIS.
- Para buscar nombres y descripciones se utiliza `pg_trgm` con índices `GIN`, evitando depender de comparaciones lentas con comodines iniciales.
- Los índices se definirán al exportar las migraciones, después de confirmar las consultas reales de la aplicación.

## Flujo de revisión y publicación

- Una ficha en `BORRADOR` puede editarse libremente por usuarios autorizados.
- El envío cambia el estado a `EN_REVISION` y crea una fila en `revisiones_publicacion`.
- El revisor puede llevarla a `APROBADO` o `RECHAZADO`, dejando una observación y la fecha de revisión.
- La publicación cambia el estado a `PUBLICADO`.
- Los cambios críticos de una ficha publicada —ubicación, clasificación, valoración, descripción, archivos principales o información de seguridad— requieren una nueva revisión antes de hacerse visibles.
- Los cambios críticos se guardan en `revisiones_publicacion.datos_propuestos`; la versión publicada continúa visible hasta su aprobación. Al aprobar, los cambios se aplican a las tablas normalizadas dentro de una sola transacción.
- Cada transición y modificación relevante genera una fila inmutable en `auditoria_fichas`.

## Orden de guardado recomendado

1. Catálogos DPA, clasificación y catálogos de opciones.
2. `centros_turisticos` con el consecutivo automático; el código puede permanecer temporalmente nulo.
3. Secciones 2 a 14 y sus observaciones.
4. `resultados_indicador` y `resultados_criterio`.
5. `puntaje_total` y `jerarquia_id`.
6. `codigo_atractivo` definitivo de 17 caracteres.

Este orden evita calcular la jerarquía o el código con una ficha incompleta.

&nbsp;
