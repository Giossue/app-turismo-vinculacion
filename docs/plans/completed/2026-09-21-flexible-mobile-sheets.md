# Plan: sheets móviles flexibles

## Objetivo

Unificar todas las sheets del mapa, excepto la ficha de centro turístico, con interacción
nativa continua: arrastre desde el controlador o el contenido, estado parcial, estado
expandido y cierre al bajar.

## Alcance

- Resultados de búsqueda de centros y catastros.
- Selección de varios lugares.
- Ficha de establecimiento/POI.
- Agente turístico.
- Eliminar los botones `X` de esas sheets.
- Mantener intacta la ficha de centro turístico.

## Verificación

- Revisar que todas compartan snap points y gestos.
- Confirmar que los scrolls usen componentes coordinados con la sheet.
- Extender el área táctil del contenido hasta el fondo visible de la sheet.
- Ejecutar formato, lint y pruebas móviles.

## Estado

- [x] Centralizar configuración flexible.
- [x] Aplicar comportamiento y retirar cierres redundantes.
- [x] Verificar el móvil con lint, TypeScript y 38 pruebas automatizadas.
