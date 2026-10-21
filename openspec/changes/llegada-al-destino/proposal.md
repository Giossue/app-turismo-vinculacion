# Proposal

## Why

Al llegar al destino, la navegación quedaba abierta con el GPS activo hasta
que la persona la cerraba. Con la app oculta, la tarea de fondo se detenía en
silencio y nadie se enteraba de la llegada. Tampoco había nada que hacer con
el lugar al que se llegó, aunque la app ya permite guardarlo y opinar.

## What Changes

- Al llegar, el modo de navegación muestra una cuenta regresiva de 60 s y se
  cierra solo al terminar; la `X` sigue cerrándolo antes.
- Si la tarea de fondo detecta la llegada con la app oculta, publica una
  notificación local «Has llegado a tu destino.» cuando hay permiso.
- Si la ruta lleva a un centro o establecimiento del catálogo, la llegada
  ofrece guardarlo, ver su ficha y, en centros, abrir sus opiniones.
- La lógica de inicio, parada y reintento de `route.tsx` pasa a hooks de
  `features/routing/application`, sin cambiar su comportamiento.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `mobile-navigation-and-location`: cierre tras la llegada, aviso en segundo
  plano y acciones sobre el lugar de destino.
