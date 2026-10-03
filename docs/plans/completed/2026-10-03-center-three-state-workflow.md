# Flujo de centros con tres estados

## Objetivo

Simplificar las fichas a `BORRADOR → EN_REVISION → PUBLICADO`. Una aprobación publica
el snapshot revisado en la misma transacción. Devolver para corregir conserva el motivo
y devuelve el borrador a edición. Activar/desactivar controla la visibilidad sin cambiar
el estado editorial.

## Alcance y permisos

- Agentes turísticos mantienen captura, propiedad y envío a revisión; sólo un administrador
  decide y cambia la activación. La autorización continúa en la API.
- Una propuesta en revisión o devuelta no reemplaza la versión pública anterior.
- Publicación conserva validaciones de catálogos, catorce secciones, valoración y multimedia.
- Tres estados actuales; decisiones y estados antiguos se conservan en el historial.
- Migración: `APROBADO → EN_REVISION`, `RECHAZADO → BORRADOR`; `INACTIVO` recupera
  `PUBLICADO` si había fecha pública, o `BORRADOR`, conservando `activo=false`.
- La migración no publica contenido ni aplica snapshots por SQL. La ficha aprobada previa
  vuelve a revisión para completar la nueva acción con validaciones de publicación.
- Catastro y opiniones conservan sus flujos independientes.
- No se incluyen cambios móviles pendientes de otras tareas ni se hacen commits/push.

## Trabajo

- [x] Implementar aprobación/publicación atómica y devolución con motivo.
- [x] Separar estado de activación en API, filtros y panel.
- [x] Crear migración idempotente, conservar códigos e históricos, desacoplar trigger.
- [x] Probar migración sobre PostgreSQL/PostGIS vacío y con estados antiguos.
- [x] Verificar transacciones, permisos, rollback, correcciones y reactivación.
- [x] Actualizar especificación, criterios, contratos y procedimiento de despliegue.
- [x] Verificar API y panel; revisar diff y compatibilidad.
- [x] Aplicar en remota únicamente con API/panel compatibles y respaldo verificado.

## Despliegue y reversión

Antes de ejecutar en remoto: confirmar base `turismo_vinculacion_app`, detener temporalmente
mutaciones de fichas y respaldar catálogo, centros, borradores, revisiones y definición del
trigger. Desplegar API compatible, aplicar migración y luego panel; verificar estados,
revisión y visibilidad. No usar el runner local para producción.

Reversión de aplicación requiere restituir el trigger anterior y estados desde el respaldo
para registros que no hayan cambiado desde la migración. Las nuevas publicaciones no se
deshacen automáticamente: se conserva auditoría y se resuelve mediante operación explícita.

## Verificación

- API: 136 pruebas focales en seis archivos, TypeScript, ESLint y build aprobados.
- Panel: `bun run verify` completo (formato, ESLint, TypeScript y Next producción)
  y 36 pruebas focales aprobadas; tres estados y activación independiente en URL/contrato.
- `bash scripts/verify-center-workflow.sh`: esquema vacío y repetición; esquema anterior
  con cinco centros de estados antiguos; preparación y siete casos de integración.
  Conserva IDs, códigos de 17 caracteres, snapshots, revisiones y auditoría; crea una
  solicitud nueva para aprobados con borrador y deja editables los aprobados sin borrador.
- PostgreSQL/PostGIS: snapshot congelado, publicación/media/auditoría atómicas, rollback
  por fallo de multimedia, devolución con motivo, edición/reenvío y publicación anterior,
  visibilidad independiente, aprobación desactivada, propiedad y dos decisiones concurrentes.
- La concurrencia reveló un bloqueo con joins que podía devolver 404 al segundo revisor;
  se cambió a bloqueo de la fila por ID y lectura fresca, y se verificó un único commit/409.
- `bash scripts/verify-admin-deletion.sh`: veinte casos aprobados y repetición de la
  migración; activar un registro eliminado sigue siendo rechazado por la restricción.
- Remota actualizada el 3 de octubre de 2026 por solicitud explícita del usuario, después
  de su push. El contrato nuevo de la API desplegada se verificó a las 18:27:29 UTC:
  tres estados, filtro de activación y acción «Aprobar y publicar».
- Conexión verificada a `turismo_vinculacion_app` como `turismo_vinculacion_app`, a través
  de `187.127.6.234:8004`; servidor PostgreSQL real `172.18.0.17:5432`. Las credenciales
  se resolvieron mediante libpq y no se mostraron ni copiaron.
- Respaldo privado de las cuatro tablas afectadas y definición del trigger en
  `~/.local/state/turismo/backups/center-flow-20261003T182859Z-3ozy80bk/`. El archivo
  se restauró en PostgreSQL/PostGIS local aislado y se verificaron todos los registros
  mediante hashes en UTC: seis estados, quince centros, un borrador y una revisión.
- Se ejecutó `20261003_center_three_state_workflow.sql` en una única transacción con
  bloqueos y comprobaciones del respaldo antes de modificar. Antes del commit se validó
  que los IDs, códigos, contenido, versión del borrador e historial previo permanecían
  iguales, que existía la nueva revisión pendiente y que la activación era independiente.
- Verificación posterior: quince centros activos, catorce en `BORRADOR` y uno en
  `EN_REVISION`; cero publicados. Un borrador en revisión, una revisión histórica
  aprobada y una nueva pendiente. Sólo `BORRADOR`, `EN_REVISION` y `PUBLICADO` están
  activos en el catálogo; los tres códigos anteriores permanecen inactivos por historial.
- La API pública respondió correctamente con cero centros. La migración conserva la
  Catedral en revisión y no publica su snapshot; requiere la decisión administrativa
  «Aprobar y publicar» con las validaciones existentes.

Implementación y migración remota completadas. El usuario realizó el push; esta tarea no
creó commits ni ejecutó push ni despliegues. No se realizó QA de navegador ni sesión real.
