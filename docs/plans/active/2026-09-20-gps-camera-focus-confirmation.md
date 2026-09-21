# Confirmación del enfoque GPS

## Objetivo

Evitar que el botón GPS desaparezca cuando la animación de la cámara fue
interrumpida antes de llegar a la ubicación y al zoom esperados.

## Alcance

- Mantener separado el enfoque solicitado del enfoque confirmado.
- Confirmar el enfoque únicamente con el evento final de cambio de región de MapLibre.
- Cancelar el enfoque pendiente ante una interacción manual y conservar el botón visible.
- Mantener intacto el comportamiento de selección y enfoque de fichas turísticas.

## Verificación

- [x] Typecheck, lint, formato y pruebas móviles.
- [ ] Comprobación manual: interrumpir el enfoque GPS conserva el botón.
- [ ] Comprobación manual: dejar terminar el enfoque GPS oculta el botón.
- [ ] Comprobación manual: volver a tocar GPS repite el enfoque.
