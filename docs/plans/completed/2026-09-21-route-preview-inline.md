# Entrega: preview de ruta manipulable

## Objetivo

Mantener abierta la pantalla «Cómo llegar» al mover el mapa, contraer la preview sin
ocultarla y usar el mismo color temático para la ruta y el punto GPS.

## Alcance entregado

- La línea y el origen de la ruta usan `map.location`, coherente con el punto GPS en light y
  dark.
- La preview reemplaza el `BottomSheet` modal por un panel inline sobre MapLibre.
- El mapa notifica solo cambios iniciados por la persona mediante `userInteraction`; los
  ajustes automáticos de cámara no contraen el panel.
- El panel muestra «Tu ubicación» y el destino, permite expandirse/contraerse y conserva un
  botón explícito para cerrar la ruta.
- Las indicaciones se desplazan completas y sus textos hacen wrapping también en navegación
  activa.
- La arquitectura documenta que tocar el mapa ya no cierra la ruta.

## Fuera de alcance

- No se modifican contratos de API, persistencia, permisos ni base de datos.
- No se ejecuta build ni se cambia la configuración nativa.

## Verificación

- Diagnósticos sin errores ni warnings en los archivos de ruta.
- Prettier correcto en código y documentación.
- `git diff --check` correcto.
