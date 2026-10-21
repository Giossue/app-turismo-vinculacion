# Design

## Context

`useNavigationSession` detecta la llegada (35 m) con la app visible y la tarea
de `expo-location` la detecta con la app oculta; en ese caso marca la sesión
inactiva y la pantalla la muestra al volver. La ruta solo recibía coordenadas
y nombre del destino.

## Decisions

- Cuenta regresiva: `useArrivalAutoClose` fija un plazo absoluto al llegar y
  llama a la misma parada que la `X`. Si la llegada ocurrió en segundo plano,
  la cuenta empieza al volver a la app, para que la persona vea el aviso.
- Notificación: se añade `expo-notifications` solo para notificaciones locales
  (sin push). Usa el canal Android `navigation-arrival` y no pide permiso: lo
  pide ya la activación de la navegación en segundo plano. Sin permiso, o con
  la app visible (la voz ya anuncia la llegada), no se publica nada.
- Lugar de destino: `buildRouteHref` acepta `place` (`center` con código o
  `establishment` con id del catastro) y lo serializa en `placeKind`/`placeId`.
  Las rutas guardadas, POI, búsquedas de dirección y el agente para lugares
  que no son centros no lo llevan, así que no muestran acciones.
- Acciones al llegar: guardar ocurre en el mismo overlay y no detiene la
  cuenta regresiva. «Ver ficha», «Opinar» (abre el centro en la pestaña de
  opiniones) y el inicio de sesión de un visitante detienen la navegación y
  luego abren su pantalla: salir de la ruta ya termina la navegación (`blur`),
  y hacerlo explícito evita que el plazo dispare sobre otra pantalla.

## Risks / Trade-offs

- La notificación requiere reconstruir el binario (config plugin nuevo).
- Android puede retrasar la última ubicación en segundo plano; la llegada se
  avisa cuando la tarea recibe esa ubicación.
