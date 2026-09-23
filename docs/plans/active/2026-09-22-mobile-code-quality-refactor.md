# Plan activo: auditoría y refactor de calidad del móvil

## Objetivo

Eliminar código muerto, extraer componentes y utilidades reutilizables, dividir las
pantallas gigantes y corregir malas prácticas detectadas en una auditoría del cliente
Expo (`apps/mobile`), sin cambiar el comportamiento salvo en los bugs documentados.

## Alcance

- Ola 1 (base compartida): `src/core/geo`, `src/core/format`, `src/core/api/http.ts`,
  `query-keys.ts`, `media-url.ts`, constructores de rutas tipadas (`buildRouteHref`,
  `buildLoginHref`), componentes `Tourism*` nuevos (estado, pestañas, filas de
  información, secciones, bottom sheet), infraestructura compartida entre los dos mapas
  MapLibre, capa de datos (`*-api.ts`, almacenamiento) y código muerto fuera de pantallas.
- Ola 2 (en paralelo, archivos disjuntos):
  - Explorar: dividir `src/app/(tabs)/index.tsx`, ficha de centro compartida con
    `src/app/centers/[code].tsx`, hojas de búsqueda y establecimientos.
  - Ruta: dividir `src/app/route.tsx`, navegación, ubicación y offline.
  - Pantallas: `login.tsx`, cuenta, guardados, ajustes, layouts, opiniones, agente.

## Fuera de alcance

- Rediseño completo del estado de overlays de Explorar con un reducer (hallazgo de
  alto riesgo; requiere pruebas manuales de Atrás, TalkBack y VoiceOver en dispositivo).
- Migración masiva de los ~200 `Text` crudos a un componente tipográfico.
- Eliminar la memoización manual existente (React Compiler está activo; no añadir nueva).

## Riesgos

- Cambios de ciclo de vida de MapLibre y de la sesión de navegación: verificar en
  dispositivo (Android Back, segundo plano, reanudar ruta).
- Sincronización de favoritos: la importación local pasa a ser única al iniciar sesión,
  como indica `docs/architecture/mobile.md`.

## Migraciones

Ninguna de base de datos.

## Verificación

- `corepack pnpm --filter @turismo/mobile typecheck`
- `corepack pnpm --filter @turismo/mobile lint`
- `corepack pnpm --filter @turismo/mobile test`
- `corepack pnpm --filter @turismo/mobile format`
- Revisión manual en dispositivo de Explorar, ficha, ruta y navegación activa.

## Estado

En curso (22 de septiembre de 2026).

- Ola 1 completada: módulos compartidos (`core/geo`, `core/format`, `core/api/http`,
  `query-keys`, `media-url`, `core/storage/json-storage`, `route-href`, `login-href`,
  componentes `Tourism*` nuevos e infraestructura de mapas) con pruebas; clientes
  `*-api.ts` migrados a `requestJson`; favoritos con importación única del resumen
  heredado; caché persistida limitada a catálogos públicos; código muerto retirado.
  Documentado en `docs/architecture/mobile.md` («Módulos compartidos»).
- Ola 2 Explorar completada: `index.tsx` queda como puerta de entrada y la pantalla pasa a
  `features/explore` (hooks de búsqueda, overlay, ubicación y consultas; un único estado
  `ExploreOverlay` sin refs espejo); ficha de centro compartida en
  `features/centers/presentation/center-detail/` para la sheet y `centers/[code].tsx`
  (carga/error dentro de `TourismScreenFrame` con Volver, código ausente como error);
  resultados declarativos con `BottomSheetFlatList` y chips compartidos; resultados y
  sugerencias pasan por el enfoque de cámara; un solo enfoque GPS por lectura; teclado
  cerrado solo desde `closeFocus`; sheet de centro sin remontar al rotar; brújula aislada;
  atribución dentro del mapa; botón Cerrar en las sheets del mapa; etiquetas accesibles.
  Pendiente de verificar en dispositivo (Atrás, TalkBack/VoiceOver, rotación, enfoque).
- Pendiente: ola 2 (división de pantallas) y revisión manual en dispositivo.
