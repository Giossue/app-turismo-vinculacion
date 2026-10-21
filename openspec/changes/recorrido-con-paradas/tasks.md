# Tasks

## 1. API

- [x] 1.1 Aceptar `waypoints` (máx. 4) en `POST /routing/route`, enviarlos a OSRM en orden y numerar las llegadas intermedias.
- [x] 1.2 Pruebas de validación y de la solicitud a OSRM con paradas.

## 2. Móvil

- [x] 2.1 ~~Recorrido local (`features/trip`): agregar, quitar, reordenar y vaciar, guardado en el dispositivo.~~ Retirado: la persona usuaria decidió quitar «Mi recorrido».
- [x] 2.2 ~~Control «Agregar al recorrido» en fichas y hojas de centros y establecimientos; pantalla «Mi recorrido» en el menú.~~ Retirado junto con 2.1.
- [x] 2.3 Paradas en el enlace de ruta (validadas), en la solicitud, en el mapa y en el panel.
- [x] 2.4 Navegación entre paradas: detección, voz, aviso de la próxima parada, recálculo con las pendientes y llegada final bloqueada hasta completar las paradas (también en la tarea de fondo).
- [x] 2.5 Pruebas de dominio del recorrido, de las paradas en el enlace y del avance entre paradas.

## 3. Evidencia y fuentes

- [x] 3.1 Actualizar arquitectura de mapas y navegación; validar el cambio OpenSpec.
- [ ] 3.2 Probar en dispositivo Android un recorrido de tres lugares a pie, con desvío y con la app en segundo plano.
- [ ] 3.3 Siguiente paso: una forma de armar recorridos (pantalla o herramienta del asistente para proponer un recorrido «arma mi día»).
