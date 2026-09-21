# Cierre de la ficha rápida del mapa

## Objetivo

Permitir que la ficha compacta del mapa se cierre al tocar fuera de ella o al
deslizarla hacia abajo, sin cambiar el comportamiento de la ficha expandida.

## Alcance

- Usar el scrim como acción de cierre únicamente mientras la ficha está compacta.
- Permitir que el gesto vertical arrastre la ficha fuera de la pantalla y la cierre
  después de superar un umbral de distancia o velocidad.
- Mantener la ficha expandida bloqueada hasta que se pulse la X.

## Verificación

- [ ] Typecheck y lint del móvil.
- [ ] Formato del móvil.
- [ ] Comprobación manual: toque fuera cierra la ficha compacta.
- [ ] Comprobación manual: arrastre hacia abajo cierra la ficha compacta.
- [ ] Comprobación manual: ficha expandida no se cierra con toque fuera ni arrastre.
