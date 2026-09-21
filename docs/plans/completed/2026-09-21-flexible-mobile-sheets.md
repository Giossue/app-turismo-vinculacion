# Plan: sheets móviles flexibles

## Objetivo

Unificar todas las sheets del mapa, incluida la ficha de centro turístico, con interacción
nativa continua: arrastre desde el controlador o el contenido, estado parcial, estado
expandido y cierre al bajar.

## Alcance

- Resultados de búsqueda de centros y catastros.
- Selección de varios lugares.
- Ficha de establecimiento/POI.
- Agente turístico.
- Eliminar los botones `X` de esas sheets.
- Conservar el contenido y las acciones de la ficha de centro turístico dentro del nuevo
  contenedor flexible.

## Verificación

- Revisar que todas compartan snap points y gestos.
- Confirmar que los scrolls usen componentes coordinados con la sheet.
- Extender el área táctil del contenido hasta el fondo visible de la sheet.
- Ejecutar formato, lint y pruebas móviles.

## Estado

- [x] Centralizar configuración flexible.
- [x] Aplicar comportamiento y retirar cierres redundantes.
- [x] Sustituir la sheet de Expo UI por la integración gestual de Gorhom para que el primer
      arrastre funcione también sobre espacios vacíos.
- [x] Verificar el móvil con lint, TypeScript y 38 pruebas automatizadas.
