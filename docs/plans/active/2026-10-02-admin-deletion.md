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

Formato, lint, tipos, pruebas y build aplicables. Aplicar migraciones sobre una base
vacía aislada y repetir la nueva migración con registros históricos. Verificar servicios
reales contra PostgreSQL/PostGIS temporal; no operar sobre la base desplegada.
