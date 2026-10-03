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

- [ ] Implementar aprobación/publicación atómica y devolución con motivo.
- [ ] Separar estado de activación en API, filtros y panel.
- [ ] Crear migración idempotente, conservar códigos e históricos, desacoplar trigger.
- [ ] Probar migración sobre PostgreSQL/PostGIS vacío y con estados antiguos.
- [ ] Verificar transacciones, permisos, rollback, correcciones y reactivación.
- [ ] Actualizar especificación, criterios, contratos y procedimiento de despliegue.
- [ ] Verificar API y panel; revisar diff y compatibilidad.
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

Pendiente. Remota inspeccionada en sólo lectura: quince centros activos, catorce borradores,
una aprobación sin publicar, cero publicados; únicamente centros/borradores/revisiones
referencian `estados_resenia`.
