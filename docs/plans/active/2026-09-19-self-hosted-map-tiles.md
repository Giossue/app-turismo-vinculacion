# Tiles cartográficos propios

## Objetivo

Usar los tiles vectoriales OpenMapTiles generados para Ecuador y servidos por
el TileServer GL propio, sin depender de ArcGIS o Stadia para el mapa base móvil.

## Alcance

- Reemplazar el estilo remoto del mapa online por un estilo servido desde TileServer GL.
- Mantener los centros turísticos propios y sus capas de ubicación.
- Reemplazar el estilo ArcGIS usado por la descarga offline.
- Mantener rutas registradas, indicaciones y contratos del backend fuera del proveedor de
  basemap.

## Verificación

- `GET /data/v3.json` responde con el TileJSON de Ecuador.
- El estilo servido referencia `data/v3.json`.
- TypeScript, ESLint del mapa y `git diff --check` pasan.
- La app conserva el fallback visual si el servidor propio no responde.
