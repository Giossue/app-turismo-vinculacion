# Inicio turístico centrado en mapa

## Objetivo

Reemplazar la pantalla de catálogo vertical por la experiencia principal móvil:
mapa a pantalla completa, búsqueda y controles flotantes, marcadores de atractivos y
una hoja inferior de selección. La ficha práctica completa permanece disponible desde
esa hoja.

## Alcance

- MapLibre ocupa el área principal de la pantalla en Android/iOS.
- Base raster pública de ArcGIS solo para desarrollo local, con atribución visible.
- Búsqueda y categorías como controles superpuestos.
- Marcador abre/cambia la hoja inferior; la hoja abre la ficha pública existente.
- No pedir GPS, ni simular navegación/rutas antes de implementar su módulo.

## Fuera de alcance

- Rutas giro a giro, geocodificación, ubicación del dispositivo, favoritos,
  fotografías reales, opiniones y navegación en segundo plano.

## Verificación

- Tipos, pruebas, lint y formato del paquete móvil.
- Development Build Android contra PostgreSQL/PostGIS local y verificación visual.

## Estado

Completado el 2026-09-16.

- Inicio móvil rediseñado como mapa de pantalla completa con controles flotantes.
- ArcGIS World Street Map verificado en el Development Build local.
- Hoja de selección, filtros superpuestos y entrada a ficha pública verificados.
