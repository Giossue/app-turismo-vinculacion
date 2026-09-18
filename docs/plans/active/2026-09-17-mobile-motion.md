# Plan: motion del menú móvil

Estado: implementado

## Objetivo

Dar al menú lateral una entrada y salida coherentes con la identidad móvil, sin añadir otra
librería visual ni convertir los overlays en rutas del historial.

## Alcance

- Reutilizar Reanimated, ya presente en `apps/mobile`.
- Usar el `ReanimatedDrawerLayout` oficial de Gesture Handler, que comparte el progreso
  nativo entre panel, scrim y gestos.
- Evitar curvas independientes que puedan producir un desfase perceptual entre el panel y
  el fondo.
- Ejecutar las acciones del menú después de desmontar visualmente el overlay.
- Respetar la preferencia de reducción de movimiento del sistema.
- Mantener el ancho adaptable y el parámetro de velocidad centralizado.

## Verificación

- `corepack pnpm --filter @turismo/mobile typecheck`
- `corepack pnpm --filter @turismo/mobile lint`
- `corepack pnpm --filter @turismo/mobile test`
- `corepack pnpm --filter @turismo/mobile format`

Resultado: todas las verificaciones pasan.
