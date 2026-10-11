# Feature: opiniones de turistas

## Resultado

Una persona autenticada puede valorar y comentar un centro turístico. El contenido
solo aparece públicamente después de una aprobación administrativa. Las ediciones no
alteran la versión publicada hasta ser aprobadas.

## Actores y permisos

- Turista autenticado: crear una opinión, consultar su estado y editar su versión
  publicada cuando no tenga otra versión pendiente.
- Administrador: consultar versiones pendientes y opiniones ya publicadas, abrir el historial completo de una opinión y aprobar o rechazar únicamente las versiones pendientes, dejando un motivo al rechazar.
- Invitado: consultar únicamente versiones aprobadas.
- Nadie puede moderar una versión que no esté pendiente ni modificar la opinión de
  otra cuenta.

## Flujo principal

1. El turista abre la pestaña Opiniones de una ficha.
2. La API devuelve resumen y versiones aprobadas. El móvil muestra veinte opiniones por
   página y permite avanzar y retroceder; al avanzar más allá de lo cargado pide la siguiente
   página. El filtro Recientes muestra las tres primeras, sin borrar el borrador del formulario.
3. El turista autenticado envía una calificación de 1 a 5, un comentario o ambos.
4. La opinión queda pendiente y no modifica el resumen público.
5. El administrador revisa la versión en el panel.
6. Al aprobar, la versión se vuelve pública; al rechazar, no cuenta para el centro.
7. Al editar una opinión publicada se crea una nueva versión pendiente.
8. Si esa edición se rechaza, la versión publicada anterior permanece sin cambios.

## Estados y excepciones

- Primera opinión rechazada: la persona puede enviar otra opinión independiente.
- Edición rechazada: se conserva la versión publicada anterior y se informa el motivo.
- Existe una versión pendiente: no se permite enviar otra ni editar hasta que sea
  resuelta.
- Sin opiniones aprobadas: se muestra estado vacío, no una calificación ficticia.
- Sin conexión: se muestran las opiniones cacheadas por la capa de consulta y se ofrece
  reintento; los envíos no se simulan localmente. Al volver a abrir la pestaña, el cliente
  revalida la lista pública para no conservar indefinidamente un estado vacío después de una
  aprobación.
  Si la consulta se pausa sin una copia, se pide conexión y se ofrece reintento sin
  mostrar una carga indefinida. El fallo de un envío se informa inmediatamente después
  del transporte; no se deja pendiente para ejecutarlo al recuperar red.
- Error de moderación concurrente: la API devuelve conflicto y el panel recarga la cola.
- La opinión propia se consulta por cuenta con cancelación. Un envío o una lectura que
  termina después de cerrar sesión o sustituirla no escribe en la caché privada actual;
  las claves de mutación también incluyen la generación, incluso para volver a entrar
  con la misma cuenta. La opinión propia y las mutaciones pendientes no se persisten.

## Datos

- `opiniones` representa la opinión lógica, propietario, destino y versión publicada.
- `opinion_versiones` conserva cada envío y su estado de moderación.
- `moderaciones_opinion` conserva las decisiones administrativas inmutables.
- Se publican únicamente calificación, comentario, fecha y un nombre de autor
  minimizado; nunca se exponen IDs internos.
- La cola administrativa expone el historial bajo demanda mediante
  `GET /admin/opinions/:reviewCode/history`, incluyendo versiones y moderaciones, solo
  para el rol `ADMINISTRADOR`.

## Eliminación administrativa

El administrador puede eliminar la opinión completa mediante
`DELETE /admin/opinions/:reviewCode`. La API bloquea la raíz, marca `eliminado_at` y
registra `ELIMINAR` en moderaciones dentro de la misma transacción. Todas las versiones
y decisiones se conservan; el historial incluye `deletedAt`. La eliminación repetida no
duplica auditoría. La opinión deja de aparecer en el panel, la lista y las calificaciones
públicas, y no puede editarse ni moderarse. El autor puede enviar una nueva opinión.
Una eliminación concurrente de un centro se serializa con la creación/edición de opiniones.
Requiere la migración `20261002_admin_logical_deletion.sql`.

## Integraciones

- API NestJS/Fastify y PostgreSQL.
- Cliente móvil Expo/React Native.
- Panel Next.js/MUI mediante la API autenticada.

## Fuera de alcance

- Reportes de opiniones por turistas.
- Fotos o respuestas del administrador.
- Opiniones de establecimientos de catastro.
- Notificaciones push sobre la decisión.
