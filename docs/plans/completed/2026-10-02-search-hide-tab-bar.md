# Ocultar navegación inferior durante la búsqueda

## Problema

La búsqueda ocupa una vista dentro de Explorar, mientras la barra de pestañas vive
en el layout y continúa dibujándose encima de la lista.

## Cambio

- La visibilidad de la barra depende de la búsqueda abierta en la pestaña enfocada.
- La barra se desmonta visualmente y no reserva su inset durante la búsqueda.
- Al cerrar, seleccionar, perder foco o desmontarse, se restaura la navegación.
- Ocultar el teclado no cierra la búsqueda ni restaura la barra.
- Sin nuevas rutas, modales, dependencias ni cambios de Metro.

## Verificación

- [x] Control de visibilidad y cleanup conectado al estado de búsqueda y foco.
- [x] Barra y espacio inferior ausentes durante la lista por composición revisada.
- [x] Tipos, lint y regresión de Atrás (2 pruebas).
- [x] Especificación y arquitectura sincronizadas.

## Resultado

El componente compartido deja de dibujar los controles y su inset vale cero cuando
la búsqueda está abierta en Explorar enfocado. El efecto limpia la publicación al
perder foco o desmontarse. Se preservan los hooks de la barra y su altura medida
para volver a mostrarla sin alterar los hosts de fichas.

La escena QA y el runner ahora incluyen la barra real y comprueban su ausencia al
escribir/enviar y su regreso al seleccionar. Esta extensión se comprobó con tipos,
lint y sintaxis de Python; no se ejecutó una nueva captura ni se inició Metro.

Fuentes: React `useLayoutEffect`/contexto, Expo Router 57 y arquitectura móvil.
