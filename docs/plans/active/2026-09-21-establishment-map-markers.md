# Plan: categorías de catastro y marcadores en el mapa

Fecha: 2026-09-21
Estado: implementado; queda pendiente comprobación visual en Development Build

## Objetivo

Mostrar en el mapa móvil los establecimientos turísticos activos que tengan coordenadas,
usando el icono y color del tipo de establecimiento al que pertenece su categoría.

## Alcance

- Añadir iconos Osmic a `catalogo_catastro_clasificaciones` con colores automáticos y
  seguros; conservar los campos antiguos de categoría durante la transición.
- Exponerlos en `GET /admin/catalogs` y permitir editarlos mediante el endpoint administrativo existente, conservando autorización y auditoría.
- Incorporar selección de icono con previsualización del pin al diálogo de edición de tipos
  de establecimiento; el color queda bloqueado y se muestra como valor informativo.
- Exponer un endpoint público acotado para establecimientos activos georreferenciados, con filtros de viewport y límites.
- Añadir una capa nativa al mapa móvil para esos establecimientos, separada de los centros turísticos y usando el icono/color de su tipo de establecimiento.
- Agrupar establecimientos cercanos a escalas amplias; mostrar un punto del color fijo de su
  pin a escala amplia y el pin Osmic completo desde un zoom cercano (`minzoom`), evitando el
  pin verde reservado para centros y la saturación de capas individuales.
- Abrir una ficha inferior al pulsar un punto o pin de catastro, con su nombre, categoría, precisión de ubicación y acceso a la ruta.
- Mantener los centros publicados, búsquedas y estados sin ubicación funcionando como antes;
  los establecimientos con coordenada territorial conservan su marca de aproximación.

## Reglas

- Solo el rol `ADMINISTRADOR` modifica la configuración; el backend valida los valores.
- El público solo recibe establecimientos `activo = TRUE`, con latitud y longitud válidas, y dentro del viewport solicitado.
- No se publica información administrativa innecesaria; el mapa recibe nombre, categoría, coordenadas e identidad pública mínima.
- Categorías sin configuración usan un fallback visual estable.
- La ausencia de establecimientos o un fallo del endpoint no oculta los centros turísticos ni bloquea la exploración.

## Verificación

- Pruebas API para devolver/actualizar icono y color y rechazar valores inválidos.
- Prueba del endpoint público con límite y viewport.
- `bun run verify` en `web-turismo-admin`.
- Build, lint y suite completa de pruebas del API; el typecheck global del API conserva un fallo previo en `test/opinions.service.spec.ts:121`.
- Typecheck, lint y suite completa de pruebas del móvil.
- Revisión del diff y comprobación visual pendiente en panel/mapa.
