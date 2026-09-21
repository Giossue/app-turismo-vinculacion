# Cancelación de navegación al salir de la ruta

## Objetivo

Evitar que una navegación siga mostrando la notificación y consumiendo ubicación
después de que la persona abandona la pantalla de ruta con Atrás, sin cancelar el
seguimiento legítimo cuando la app pasa a segundo plano.

## Alcance

- Tratar la pantalla de ruta como propietaria del ciclo de vida de la sesión activa.
- Cancelar de forma idempotente la tarea foreground, la sesión persistida, la voz y
  el estado local al salir de la pantalla.
- No cancelar por minimizar la app ni por cambiar temporalmente de aplicación.
- Proteger el inicio asíncrono contra una navegación que termina mientras se esperan
  permisos o se registra la tarea nativa.

## Verificación

- [x] Typecheck, lint y pruebas del móvil.
- [x] Comprobación de que la documentación describe el flujo Atrás/segundo plano.
- [x] Prueba manual en Android: iniciar, pulsar Atrás y confirmar que la ruta vuelve
  al mapa, desaparece la notificación y se libera la solicitud GPS.
- [x] Prueba manual adicional: iniciar y minimizar sin pulsar Atrás mantuvo la
  notificación y la solicitud GPS; al volver y tocar Detener, ambas se limpiaron.
