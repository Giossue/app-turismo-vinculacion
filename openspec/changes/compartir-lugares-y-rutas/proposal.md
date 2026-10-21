# Proposal

## Why

El turista no puede enviar a otra persona un atractivo, un establecimiento o una ruta que encontró en Rumbo EC. Solo los establecimientos tienen un enlace público (`/e/:id`, el del código QR); los centros y las rutas no tienen ninguno, y quien recibe un enlace sin la app instalada no tiene cómo conseguirla desde ahí.

## What Changes

- Botón de compartir (ícono) junto a «Cómo llegar» y guardar en la ficha y la hoja del mapa de centros y establecimientos; «Compartir ruta» en la vista previa de la ruta.
- La app abre la hoja nativa de compartir con el nombre y un enlace https corto sobre el origen público de la API: `/c/:code`, `/e/:id` y `/r?lat=&lng=&name=&mode=`.
- La API sirve `/c/:code` y `/r` como páginas HTML estáticas (sin scripts) con «Abrir en la app» (`rumbo-ec://`), «Cómo llegar» de Google Maps y un enlace a `/descargar`. La página del QR (`/e/:id`) gana el mismo enlace de descarga.
- Los parámetros que llegan por enlace se validan en la app y en la API: códigos de centro alfanuméricos, ids numéricos acotados, coordenadas WGS84, modo conocido y nombre sin caracteres de control y recortado a 120 caracteres.
- La ficha de un centro abierta desde un enlace sin historial vuelve al mapa con Atrás.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `public-tourism-discovery`: compartir lugares y rutas con enlaces públicos que abren la app o permiten descargarla.

## Impact

- Móvil: `features/sharing`, `PlaceActions`, fichas de centro/establecimiento, hojas del mapa, panel de vista previa de ruta y `parseRouteSearchParams`.
- API: módulo `sharing` con `/c/:code` y `/r` fuera del prefijo `api/v1`; pie de descarga en las páginas públicas.
- Sin migraciones ni dependencias nuevas.
