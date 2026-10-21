# Proposal

## Why

«Cómo llegar» solo lleva a un lugar. Quien visita Guaranda suele recorrer
varios atractivos en un día y hoy tiene que volver a abrir la ruta en cada
uno, sin una vista del orden ni del trayecto completo.

## What Changes

- La API de rutas acepta hasta cuatro paradas intermedias (`waypoints`) antes
  del destino y numera sus llegadas («Llegaste a la parada N»).
- Las fichas y hojas del mapa de centros y establecimientos ofrecen agregar el
  lugar a «Mi recorrido» (hasta cinco lugares, sin repetir).
- «Mi recorrido» (menú) permite ver, reordenar y quitar paradas, vaciar el
  recorrido y abrir «Cómo llegar en orden»; el último lugar es el destino.
- La ruta muestra las paradas pendientes en el mapa y en el panel. Durante la
  navegación anuncia cada parada alcanzada, sigue hacia la siguiente y al
  recalcular solo pide las pendientes. La llegada final usa el flujo de
  llegada existente (cuenta regresiva de 60 s y acciones del lugar).

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `mobile-navigation-and-location`: recorridos con varias paradas.

## Out of scope

- Compartir un recorrido: el enlace de ruta compartido lleva solo el destino;
  con paradas, la vista previa no ofrece compartir.
- Guardar un recorrido como ruta guardada: las rutas guardadas no conservan
  paradas.
- «Arma mi día» desde el asistente: queda como siguiente paso (ver diseño).
