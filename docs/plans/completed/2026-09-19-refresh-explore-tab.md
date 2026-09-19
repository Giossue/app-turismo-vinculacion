# Plan: refrescar Explorar al pulsar la pestaña activa

Fecha: 2026-09-19
Estado: completado.

## Objetivo

Permitir que el turista actualice los centros publicados desde la pestaña **Explorar**
sin cerrar ni reiniciar la aplicación: al pulsar **Explorar** cuando ya está activa se
vuelve a consultar la API y se muestra retroalimentación nativa de carga.

## Alcance realizado

- La barra inferior emite `tabPress` únicamente cuando **Explorar** ya está activa.
- La pantalla vuelve a consultar los centros remotos y cierra overlays transitorios del
  mapa durante esa acción.
- `ActivityIndicator` y texto accesible informan la actualización debajo de los chips
  (y de los filtros avanzados si están abiertos), incluido el reintento después de un
  error.
- Entrar a **Explorar** desde otra pestaña solo navega; no dispara una consulta extra.

## Fuera de alcance

- Cambios en el caché, los tiles, la API o el binario nativo.
- Reinicio de Metro, la aplicación o el dispositivo.

## Archivos

- `apps/mobile/src/app/(tabs)/_layout.tsx`
- `apps/mobile/src/app/(tabs)/index.tsx`

## Verificación

- `corepack pnpm --filter @turismo/mobile typecheck` ✅
- `corepack pnpm --filter @turismo/mobile lint` ✅
- `corepack pnpm --filter @turismo/mobile test` ✅ — 4 archivos, 11 pruebas
- `corepack pnpm --filter @turismo/mobile format` ✅
- `git diff --check` ✅

Durante la verificación también se eliminó una propiedad `right` duplicada en el botón
de atribución del mapa, que impedía pasar TypeScript y lint.
