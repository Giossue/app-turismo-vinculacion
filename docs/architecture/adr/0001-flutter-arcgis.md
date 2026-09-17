# ADR-0001: Flutter para la aplicación móvil con ArcGIS

- Estado: sustituida por ADR-0004
- Fecha: 2026-09-16

## Contexto

El producto requiere Android/iOS, mapas ArcGIS y navegación giro a giro dentro de la
aplicación. React Native fue considerado inicialmente, pero no dispone de un SDK oficial
ArcGIS equivalente; integrarlo exige puentes Kotlin/Swift o limitarse a REST/renderizado
de terceros.

## Decisión

Usar Flutter con ArcGIS Maps SDK for Flutter. Mantener Next.js para la web.

## Alternativas

- React Native + puentes nativos: dos integraciones y mayor mantenimiento.
- React Native + REST/otro renderer: menor paridad para navegación/offline.
- Kotlin + Swift separados: máxima capacidad y doble implementación.

## Consecuencias

- El equipo aprende Dart/Flutter.
- Se obtiene integración oficial de mapas, rutas y navegación.
- HeroUI queda limitado a la web; móvil usa un design system Flutter propio.
- Antes de cerrar soporte se valida el Android mínimo exigido por el SDK en dispositivos objetivo.
