## ADDED Requirements

### Requirement: Compartir lugares y rutas

El móvil SHALL permitir compartir un centro, un establecimiento con id o el destino de una ruta mediante la hoja nativa del sistema, con el nombre y un enlace https sobre el origen público de la API (`/c/:code`, `/e/:id`, `/r`).

#### Scenario: Compartir un lugar

- **WHEN** el turista toca compartir en la ficha o en la hoja del mapa de un centro o establecimiento
- **THEN** se abre la hoja del sistema con el nombre del lugar y su enlace público

#### Scenario: Compartir una ruta

- **WHEN** el turista toca «Compartir ruta» en la vista previa
- **THEN** el enlace incluye destino, nombre y modo, y no la geometría calculada

#### Scenario: Cancelar

- **WHEN** el turista cierra la hoja sin elegir una aplicación
- **THEN** no se muestra ningún error

### Requirement: Páginas públicas de enlaces compartidos

La API SHALL servir `/c/:code` y `/r` como páginas HTML sin scripts que ofrecen abrir la app con `rumbo-ec://`, «Cómo llegar» y descargar la app; validará y escapará los parámetros recibidos.

#### Scenario: Enlace válido sin la app

- **WHEN** alguien abre el enlace en un navegador
- **THEN** ve el nombre del lugar o del destino, «Abrir en la app», «Cómo llegar» y un enlace a `/descargar`

#### Scenario: Enlace inválido o retirado

- **WHEN** el código no es alfanumérico, el centro no está publicado o las coordenadas no son válidas
- **THEN** se responde una página de error sin consultar la base para entradas mal formadas

### Requirement: Apertura segura de enlaces en la app

El móvil SHALL validar los parámetros que llegan por enlace antes de consultar la API o calcular una ruta, y la ficha abierta sin historial volverá al mapa con Atrás.

#### Scenario: Parámetros manipulados

- **WHEN** un enlace trae un código con caracteres no permitidos, un id no numérico, coordenadas fuera de rango o un nombre con caracteres de control
- **THEN** la app muestra el estado de enlace inválido o usa un nombre limpio de hasta 120 caracteres

#### Scenario: Ficha abierta desde un enlace

- **WHEN** el turista pulsa Atrás en una ficha abierta desde un enlace
- **THEN** vuelve al mapa de Explorar
