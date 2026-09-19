# Transiciones suaves de navegación móvil

## Objetivo

Aplicar transiciones suaves y consistentes entre pestañas y pantallas secundarias
sin alterar el historial, los gestos de Atrás ni el estado efímero del mapa.

## Alcance

- Mantener desactivadas las transiciones nativas de Stack y Tabs para eliminar el flash blanco
  de `react-native-screens` en navegadores anidados.
- Evitar capas adicionales de animación en el shell hasta contar con una transición global que
  no dependa de la implementación nativa del navegador.
- Reservar Reanimated para drawers, gestos y overlays, sin animar dos veces el shell de pantalla.
- Verificar TypeScript y formato.

## Fuera de alcance

- Animar cambios de cámara, filtros o overlays del mapa.
- Cambiar rutas, orden de pestañas o comportamiento del botón Atrás.
