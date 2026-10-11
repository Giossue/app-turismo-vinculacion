# Repetición y concurrencia

## Estado actual

La API tiene transacciones y versiones en flujos administrativos y rotación de
sesión; esto no equivale a un contrato general de `Idempotency-Key`.
No se encontró middleware/tabla de idempotencia global, outbox ni BullMQ en la API.
El cliente del panel serializa guardados por ficha, pero otro cliente puede escribir.

Un bloqueo de botón limita repetición local. Una versión detecta conflicto si la
API la comprueba. Una transacción agrupa escrituras. Ninguno por sí solo garantiza
un único efecto entre clientes o ante un resultado de red desconocido.

## Diseñar una mutación

Documentar actor y registro, estado permitido, repetición, versión, cambios
atómicos y auditoría. Si requiere una clave de idempotencia, definir alcance por
identidad/operación, fingerprint del payload, retención, respuesta reutilizada
y rechazo de una misma clave con otro cuerpo. Una clave nunca autoriza un registro.

Usar constraints y coordinación transaccional en PostgreSQL. Las operaciones
externas se coordinan con un estado durable cuando el riesgo lo requiere; no
mantener llamadas lentas dentro de locks de negocio. Esto es diseño para cambios
nuevos, no una garantía incorporada al instalar knowledge.

## Resultado desconocido

Un timeout no demuestra rollback. Consultar o reconciliar antes de repetir
publicación, creación o archivos. Un reintento de 409 necesita revisar el nuevo
estado; no tomarlo como permiso para sobrescribir.

Fuentes: [backend](backend.md), [datos](database.md) y [acceso](../security/access-control.md).
