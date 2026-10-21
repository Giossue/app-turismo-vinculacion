# Proposal

## Why

La app ya etiqueta la mayoría de sus controles, pero varios tokens de texto no
llegaban al contraste AA, el objetivo táctil compartido era de 44 dp (Android
recomienda 48 dp) y algunos estados no llegaban al lector de pantalla: los
errores de carga solo se leían al mover el foco y el visor de fotos no decía en
qué posición estaba cada imagen.

## What Changes

- Paleta: `textFaint` claro `#737373` → `#636363`, `textFaint` oscuro
  `#8a8a8a` → `#999999` y `danger` oscuro `#f44336` → `#ff6659`, para que todo
  rol de texto cumpla 4,5:1 sobre todas las superficies.
- `turismoMetrics.touchTarget` pasa de 44 a 48 dp y `chipHitSlop` de 4 a 6, de
  modo que un chip de 36 dp alcanza 48 dp de área táctil.
- `TourismStateView` anuncia los errores nuevos con
  `AccessibilityInfo.announceForAccessibility`.
- El visor de fotografías etiqueta cada foto con su posición («Fotografía 2 de
  5») y el contador tiene una etiqueta legible.
- Las miniaturas de la galería del centro llevan la etiqueta en el botón y la
  pantalla de error de la app etiqueta «Reintentar».
- Prueba de tokens que verifica contraste AA, estrellas a 3:1 y el objetivo
  táctil mínimo.

La navegación activa y la vista previa de rutas quedan fuera: se revisan junto
con el cambio de rutas con varias paradas.

## Capabilities

### New Capabilities

- `mobile-accessibility`: contraste, objetivo táctil y anuncios al lector.

### Modified Capabilities

Ninguna.

## Impact

Solo móvil: `core/ui/tokens.ts`, `tourism-state.tsx`, `photo-viewer.tsx`,
`center-photos.tsx` y `app-error-fallback.tsx`, más dos módulos puros
(`color-contrast.ts`, `photo-viewer-label.ts`) y su prueba. Los controles que
usan `touchTarget` crecen 4 dp. Sin dependencias ni cambios de API.
