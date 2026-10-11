# public-tourism-discovery Specification

## Purpose

Describir la consulta pública de información turística visible, sus filtros y
las referencias que el móvil usa para explorar y abrir fichas.

## Requirements

### Requirement: Centros públicos visibles

La API SHALL entregar en el descubrimiento público únicamente centros publicados, activos y no eliminados.

#### Scenario: Ficha publicada

- **WHEN** se consulta el código de un centro visible
- **THEN** la API devuelve su ficha pública

#### Scenario: Ficha no visible

- **WHEN** el código corresponde a un centro no publicado, desactivado, eliminado o inexistente
- **THEN** la consulta pública no entrega la ficha y responde como no encontrada

### Requirement: Filtros y paginación de centros

La API SHALL validar filtros textuales, territoriales y espaciales y devolver centros con total, límite y desplazamiento de la página.

#### Scenario: Página válida

- **WHEN** el consumidor solicita una página con filtros válidos
- **THEN** recibe elementos filtrados y metadatos coherentes con limit y offset

#### Scenario: Caja espacial incompleta

- **WHEN** se envían límites espaciales incompletos o inválidos
- **THEN** la API rechaza la consulta sin interpretar silenciosamente otra cobertura

### Requirement: Búsqueda pública heterogénea

La API SHALL permitir buscar centros publicados, establecimientos y referencias geográficas, conservando el tipo y referencia de cada resultado; la distancia opcional es en línea recta.

#### Scenario: Búsqueda con posición

- **WHEN** se envía texto válido y un par válido de coordenadas
- **THEN** los resultados incluyen sus referencias y la cercanía participa en su orden, sin presentar la distancia como ruta navegable

### Requirement: Catálogos de descubrimiento

La API SHALL exponer catálogos públicos de filtros para que el consumidor use referencias del dominio vigente.

#### Scenario: Obtener filtros

- **WHEN** el móvil consulta los catálogos de descubrimiento
- **THEN** recibe opciones del catálogo público sin necesitar sesión institucional

### Requirement: Revalidación móvil al volver a la app o recuperar conexión

El móvil nativo SHALL revalidar las consultas activas vencidas al recuperar el foco o la conectividad, sin solicitar ubicación ni invalidar consultas vigentes. Una lectura inicial de conectividad tardía no sustituye un evento posterior y las suscripciones terminan al desmontar su proveedor.

#### Scenario: Volver al primer plano

- **WHEN** el turista vuelve a la app con conexión y una consulta visible vencida
- **THEN** se solicita su versión actual y se conserva el dato disponible mientras se carga

#### Scenario: Recuperar la red

- **WHEN** se recupera conexión y existe una consulta activa vencida o pausada por falta de red
- **THEN** la consulta puede continuar sin reiniciar la app

#### Scenario: Consulta todavía vigente

- **WHEN** se recupera foco o conexión con una consulta activa todavía vigente
- **THEN** ese evento por sí solo no fuerza otra solicitud

#### Scenario: Estado inicial tardío

- **WHEN** llega un evento de conexión después de empezar una lectura inicial de estado y antes de que esta termine
- **THEN** se conserva el estado del evento más reciente

### Requirement: Vigencia individual de consultas persistidas

El móvil SHALL persistir únicamente consultas exitosas permitidas y excluir entradas con más de 24 horas desde su actualización, aunque otras consultas renueven el snapshot. Búsquedas, cajas del mapa y consultas derivadas de GPS permanecen en memoria; los paquetes de ciudades descargados conservan su ciclo propio.

#### Scenario: Entrada antigua en un snapshot reciente

- **WHEN** se restaura una copia reciente que contiene una entrada actualizada hace más de 24 horas
- **THEN** esa entrada se descarta sin descartar las entradas públicas todavía vigentes

#### Scenario: Ubicación y descargas

- **WHEN** se escribe la caché o vencen sus consultas públicas
- **THEN** no se persisten consultas de búsqueda, viewport o GPS ni se eliminan los manifiestos o paquetes nativos de ciudades descargadas

### Requirement: Disponibilidad offline ante consultas pausadas

El móvil SHALL permitir usar ciudades, fichas y filtros descargados al arrancar sin conexión, aunque las consultas remotas se pausen. Cuando no existe una copia disponible, las superficies de consulta muestran el estado de conexión y reintento sin mantener una carga indefinida. Los reintentos periódicos del mapa requieren conexión y primer plano.

#### Scenario: Arranque sin conexión con descargas

- **WHEN** el turista abre la app sin red y ya tiene una ciudad descargada
- **THEN** puede consultar sus pines, fichas y filtros locales sin esperar una solicitud remota

#### Scenario: Consulta pausada sin copia

- **WHEN** se abre una consulta remota sin conexión ni copia disponible
- **THEN** se informa que necesita conectarse y se ofrece reintento sin afirmar que no existen resultados

#### Scenario: Reintento periódico sin foco o red

- **WHEN** el mapa usa descargas porque la API no está disponible y la app pierde foco o conexión
- **THEN** el reintento periódico no solicita nuevos datos hasta que existan ambas condiciones

#### Scenario: Destino retirado de publicación

- **WHEN** la API responde que una ficha ya no está disponible o no permite consultarla
- **THEN** no se utiliza el fallback local para revivir ese destino

### Requirement: Transporte móvil con espera acotada

El móvil SHALL acotar solicitudes JSON y su lectura por operación; vencer el plazo es un fallo de transporte, mientras cancelar conserva la cancelación y no activa un fallback que sustituya un destino retirado.

#### Scenario: API no responde

- **WHEN** una consulta pública supera su plazo sin completar la lectura
- **THEN** termina con un error de transporte y puede usar la copia local permitida

#### Scenario: Cancelación o publicación retirada

- **WHEN** se cancela la consulta o la API responde 404/403
- **THEN** se conserva esa causa y no se revive un destino con su copia offline

### Requirement: Descubrimiento progresivo y memoria transitoria

El móvil SHALL mostrar las páginas de atractivos del viewport al recibirlas, completar el área sin un recorte silencioso, cancelar al cambiar de consulta y retirar búsquedas inactivas de memoria tras cinco minutos.

#### Scenario: Área con varias páginas

- **WHEN** una caja contiene más de cien atractivos
- **THEN** la primera página se muestra antes de completar las restantes y todos los códigos válidos quedan disponibles

#### Scenario: Cambiar de caja

- **WHEN** se cambia la caja mientras se consulta otra
- **THEN** la respuesta anterior no se mezcla con las páginas nuevas ni persiste el viewport

#### Scenario: Búsquedas abandonadas

- **WHEN** una búsqueda deja de tener observadores durante cinco minutos
- **THEN** puede retirarse de memoria sin borrar favoritos o mapas descargados
