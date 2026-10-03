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
- [ ] Aplicar en remota únicamente con API/panel compatibles y respaldo verificado.

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
- Remota inspeccionada sólo en lectura: quince centros activos, catorce borradores,
  una aprobación sin publicar, cero publicados. La API remota aún no tiene el nuevo contrato
  OpenAPI; no se ejecutó la migración ni se desplegó desde esta tarea.

La implementación está preparada; queda actualización coordinada remota. Las reglas locales
exigen solicitud explícita para hacer push. El plan permanece activo hasta aplicar y verificar
el despliegue y la migración compatibles. No se realizó QA de navegador ni sesión real.
