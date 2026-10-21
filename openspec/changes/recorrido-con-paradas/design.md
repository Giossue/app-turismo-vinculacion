# Design

## Context

La API calcula rutas con OSRM `route/v1`, que ya admite varios puntos y
devuelve un tramo (`leg`) por par consecutivo, cada uno terminado en un paso
`arrive`. El móvil recibía solo origen y destino.

## Decisions

- Contrato: `POST /routing/route` acepta `waypoints` opcional (máximo 4
  coordenadas válidas, validadas con zod). Con el destino, un recorrido tiene
  hasta cinco lugares; el límite acota el costo del proveedor. La respuesta no
  cambia de forma: los pasos `arrive` intermedios dicen «Llegaste a la parada N».
  El móvil envía solo coordenadas; los nombres de las paradas no salen del
  teléfono.
- (Retirado en la 1.0.9) Recorrido local: `features/trip` guardaba en AsyncStorage
  (`rumbo-ec-trip-v1`) la lista ordenada de lugares públicos del catálogo
  (centro por código o establecimiento por id, con coordenadas). No contiene
  la ubicación de la persona ni depende de la cuenta.
- Enlace: `buildRouteHref` serializa las paradas intermedias en `waypoints`
  como `[[latitud, longitud, nombre], …]`. Es entrada no confiable: JSON
  inválido, más de 4 paradas o una coordenada fuera de rango descartan todas
  las paradas; los nombres se limpian y recortan como el del destino.
- Avance: la pantalla de ruta lleva `reached` (paradas alcanzadas) y
  `requestedFrom` (primera parada incluida en la ruta pedida). Al recalcular
  se piden solo las pendientes. La sesión deduce de la propia ruta con qué
  paradas se pidió (tantas como llegadas intermedias tenga), así que una ruta
  provisional durante el recálculo no desordena el avance.
- Parada alcanzada: a 35 m (el mismo umbral del destino) o cuando la guía ya
  pasó su paso `arrive` (por ejemplo, al volver del segundo plano). Se anuncia
  por voz «Llegaste a {lugar}» junto con la siguiente instrucción.
- Destino final: solo cuenta cuando se alcanzaron todas las paradas, para que
  un recorrido circular no termine al salir. La sesión persistida guarda
  `arrivalArmed`; la tarea de fondo no sigue el avance entre paradas y no
  cierra la sesión mientras queden. Las sesiones guardadas antes de este
  cambio se leen con `arrivalArmed: true`.

## Risks / Trade-offs

- Con la app oculta durante todo el recorrido, la llegada final se detecta al
  volver a la app (la tarea de fondo no sabe qué paradas se visitaron).
- En tramos de ida y vuelta por la misma vía, la proyección sobre el trazado
  puede dar una parada por pasada algo antes de tiempo.
- Agregar paradas desde el asistente («arma mi día») necesita una herramienta
  nueva del agente con sus límites y revisión según `docs/architecture/ai.md`;
  queda como siguiente paso.
