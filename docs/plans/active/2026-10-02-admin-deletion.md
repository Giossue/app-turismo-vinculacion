# Eliminación administrativa

## Alcance

El administrador puede eliminar centros turísticos, establecimientos, opiniones y las
cinco opciones de catálogo administrables en el portal independiente. La eliminación
es lógica: conserva identificadores, relaciones, versiones y auditoría, retira los
registros de las consultas operativas y públicas y evita su edición o reactivación.
Los agentes y turistas no reciben este permiso. La desactivación sigue siendo reversible.

## Trabajo

- Migración aditiva de `eliminado_at`, restricciones de activación y acciones de auditoría.
- DELETE protegido por autenticación y rol, con bloqueo y escritura en una transacción.
- Filtros de lectura y controles de mutación para registros eliminados.
- Referencias históricas de catálogos visibles y conservables en fichas existentes;
  validación estricta para asignaciones nuevas.
- Exclusión de opiniones eliminadas de calificaciones y unicidad de opiniones vigentes.
- Confirmación, feedback y paginación en `web-turismo-admin`.
- Pruebas de autorización, transacciones, historia y desaparición de los registros.

## Despliegue

Aplicar `20261002_admin_logical_deletion.sql` antes de desplegar la API y posteriormente
la web. No hay backfill ni eliminación física. La migración usa límites de espera por
bloqueos y mantiene datos y acciones de auditoría existentes.

Si se revierte la aplicación, conservar columnas y restricciones: la API anterior puede
mostrar registros eliminados como inactivos en administración, pero las restricciones
impiden reactivarlos. No retirar marcadores ni acciones de auditoría mediante rollback;
resolver cualquier ajuste con una nueva migración.

## Verificación

Formato, lint, tipos, pruebas y build de la API y web aprobados. El portal tiene 175
pruebas y la API 327 pruebas unitarias aprobadas; el harness de PostgreSQL/PostGIS
aplica el esquema desde cero y pasa 20
pruebas reales, incluidas referencias históricas y cinco comprobaciones de bloqueo
ante asignación y eliminación simultáneas. La migración se repite con registros y
auditoría conservados.

El runner local registra migraciones y checksums para ejecutar solo las pendientes;
su prueba verifica reinicios, reintentos, rollback y adopción del checkpoint completo.

## Estado

Implementado localmente y pendiente de despliegue. No se modificó la base desplegada;
los clústeres temporales de pruebas se retiraron al terminar.
