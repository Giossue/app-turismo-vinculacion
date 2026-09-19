# Transiciones suaves de navegación móvil

## Objetivo

Aplicar transiciones suaves y consistentes entre pestañas y pantallas secundarias
sin alterar el historial, los gestos de Atrás ni el estado efímero del mapa.

## Alcance

- Activar una transición breve entre las pestañas principales.
- Configurar una transición lateral para las pantallas del stack.
- Añadir una entrada sutil con Reanimated al shell compartido de pantallas.
- Respetar reducción de movimiento y verificar TypeScript/formato.

## Fuera de alcance

- Animar cambios de cámara, filtros o overlays del mapa.
- Cambiar rutas, orden de pestañas o comportamiento del botón Atrás.
