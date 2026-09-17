# ADR-0004: React Native/Expo y MapLibre para móvil

- Estado: aceptada
- Fecha: 2026-09-16
- Sustituye: ADR-0001

## Contexto

El equipo desarrolla en Linux y necesita entregar Android/iOS desde una única base
TypeScript. ArcGIS Maps SDK for Flutter no admite Linux como host de desarrollo. React
Native no dispone de un SDK oficial ArcGIS equivalente, por lo que se descarta depender
de puentes no mantenidos o de un WebView de mapa.

## Decisión

Usar React Native con Expo y TypeScript. MapLibre React Native renderiza mapas y
marcadores nativos. El cálculo de rutas se diseña como integración de backend con un
proveedor intercambiable. Las builds iOS se producen con EAS en macOS cloud.

## Consecuencias

- Linux permite desarrollar y verificar Android; EAS permite builds iOS remotas.
- MapLibre requiere Expo Development Build y no funciona dentro de Expo Go.
- El mapa deja de incluir por sí mismo navegación/offline; estas capacidades requieren
  una feature y un proveedor de rutas evaluado.
- Se preservan los contratos HTTP, PostGIS, NestJS, Next.js y los modelos de datos.
