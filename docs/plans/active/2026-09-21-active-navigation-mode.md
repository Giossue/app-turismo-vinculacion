# Plan: modo de navegación activa

Fecha: 2026-09-21

## Objetivo

Separar la vista previa de «Cómo llegar» del modo de navegación activa para que iniciar
la ruta abra una experiencia de pantalla completa, enfocada en el siguiente movimiento,
la posición actual y el resumen dinámico del trayecto.

## Alcance

- Mantener el `BottomSheet` y los selectores únicamente en la vista previa.
- Mostrar en navegación activa el mapa completo, la próxima maniobra, recentrado y una
  barra inferior con tiempo, distancia restante, hora estimada y cierre explícito.
- Impedir que el modo activo termine por arrastre del panel o por Atrás; solo se detiene
  con `X`, llegada o cierre de la aplicación.
- Reutilizar el seguimiento GPS, recálculo, persistencia y voz ya existentes.

## Verificación

- TypeScript, pruebas móviles y diff sin errores.
- Comprobar que la vista previa conserva sus gestos y que el modo activo no presenta
  el panel ni permite salir accidentalmente por gestos.
