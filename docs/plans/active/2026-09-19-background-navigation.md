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
  explicar su finalidad y ofrecer continuar únicamente en primer plano si la persona lo
  rechaza.
- Solicitud de notificaciones en Android 13 o posterior al iniciar la navegación para que el
  servicio foreground sea visible en el cajón del sistema.
- Registro del servicio foreground dentro de la acción de inicio, mientras la aplicación está
  activa, con una promesa compartida para evitar carreras entre la pantalla y la tarea.
- Persistencia de la ruta activa, destino, modo y última ubicación; nunca una traza completa.
- Actualización de la interfaz al volver a primer plano; el último punto guardado se
  reevalúa entonces para indicaciones, llegada y recálculo si hubo desvío. La tarea de
  segundo plano no hace llamadas de red ni conserva una traza.
- Detención y limpieza al llegar, cancelar o detener explícitamente la navegación.
- La tarea de segundo plano verifica la distancia al destino y detiene el servicio al llegar,
  incluso si la pantalla no está visible.
- La notificación foreground reutiliza el mismo registro y actualiza su cuerpo con la próxima
  maniobra y la distancia aproximada; la clave de contenido evita actualizaciones redundantes.
  Android 13 o posterior puede permitir descartarla, por lo que el servicio comprueba el mismo
  registro en cada actualización de ubicación y lo vuelve a publicar si falta. Esto no evita
  que el Task Manager detenga toda la aplicación.
- En Android, `expo-location` 57.0.19 queda fijado con un parche pequeño que permite actualizar
  las opciones de un servicio foreground ya iniciado mientras la actividad está pausada. El
  parche no permite iniciar servicios nuevos desde segundo plano.
- Una limpieza por desmontaje de pantalla no cancela la tarea: minimizar o destruir
  temporalmente la actividad no equivale a detener la navegación.
- La sesión visible no depende del permiso de segundo plano: si se rechaza, conserva el
  `watchPositionAsync` mientras la app está abierta y no inicia la tarea persistente ni pide
  el permiso de notificaciones del servicio.

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
- Verificación en Android conectado: después de enviar la app a inicio, el servicio
  `LocationTaskService` permanece foreground, la tarea de `TaskJobService` queda persistida,
  Android continúa recibiendo ubicaciones y permanece visible la notificación de navegación
  con el texto dinámico de la próxima maniobra.
- Verificación manual adicional: la misma notificación mostró `En 190 m: Sal desde tu
ubicación` en primer plano y siguió visible después de enviar la app a inicio; al pulsar
  `Detener`, la notificación desapareció y el servicio dejó de estar foreground. La nueva
  compilación debe comprobar además que, si se desliza, vuelve a aparecer en la siguiente
  actualización de ubicación.
