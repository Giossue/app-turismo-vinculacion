# Spec Delta

## ADDED Requirements

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
