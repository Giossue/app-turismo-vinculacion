# Plan: navegación persistente en segundo plano

Fecha: 2026-09-19.

## Objetivo

Mantener una sesión de navegación activa cuando la persona cambia de aplicación o apaga la
pantalla, y restaurar la última ubicación al volver a primer plano.

## Alcance

- Tarea global de `expo-task-manager` conectada a `expo-location`.
- Servicio foreground de Android y configuración de ubicación en segundo plano para Android
  e iOS mediante el plugin de Expo.
- Solicitud de permiso de segundo plano solo al pulsar «Iniciar navegación», después de
  explicar su finalidad.
- Persistencia de la ruta activa, destino, modo y última ubicación; nunca una traza completa.
- Actualización de la interfaz al volver a primer plano; el último punto guardado se
  reevalúa entonces para indicaciones, llegada y recálculo si hubo desvío. La tarea de
  segundo plano no hace llamadas de red ni conserva una traza.
- Detención y limpieza al llegar, cancelar o detener explícitamente la navegación.

## Fuera de alcance

- Reiniciar automáticamente una sesión después de que el usuario fuerce el cierre de la app.
- Analítica, historial de trayectos o envío de coordenadas a proveedores externos.
- Garantizar ejecución ante restricciones agresivas del fabricante, ahorro extremo de batería
  o revocación del permiso por el sistema.

## Verificación

- Lint, typecheck, pruebas y formato locales.
- Development Build reconstruido con permisos nativos nuevos.
- Prueba manual: iniciar navegación, cambiar de aplicación durante al menos un minuto,
  regresar, comprobar última ubicación y detener la sesión.
