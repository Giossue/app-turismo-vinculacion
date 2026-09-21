# Plan: categorías de catastro y marcadores en el mapa

Fecha: 2026-09-21
Estado: implementado; pendiente comprobación visual en dispositivo

## Objetivo

Permitir que una categoría de catastro administre un icono y un color, y mostrar en el mapa móvil los establecimientos turísticos activos que tengan coordenadas, usando esa configuración visual.

## Alcance

- Añadir icono y color a `catalogo_catastro_categorias` con valores seguros y retrocompatibles.
- Exponerlos en `GET /admin/catalogs` y permitir editarlos mediante el endpoint administrativo existente, conservando autorización y auditoría.
- Incorporar controles de selección de icono y color al diálogo de edición de categorías de catastro.
- Exponer un endpoint público acotado para establecimientos activos georreferenciados, con filtros de viewport y límites.
- Añadir una capa nativa al mapa móvil para esos establecimientos, separada de los centros turísticos y usando el icono/color de su categoría.
- Mantener los establecimientos sin agrupación visual: mostrar un punto del color de su categoría a escala amplia y reemplazarlo por el pin del centro turístico desde un zoom cercano (`minzoom`), evitando círculos con cantidades.
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
