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

Implementado y aplicado a la base de producción `turismo_vinculacion_app` el
2026-10-02. Los clústeres temporales de pruebas se retiraron al terminar.

## Incidencia del despliegue del 2026-10-02

El panel devolvió «Ocurrió un error inesperado» en los listados después de actualizar
la aplicación sin aplicar esta migración. La conexión verificada a
`turismo_vinculacion_app` confirmó que faltaban las ocho columnas `eliminado_at`.
Las consultas públicas de catastro y teselas también devolvían HTTP 500; el health
del proceso permanecía en HTTP 200 y no detectaba este desfase.

- [x] Verificar la base objetivo, propietarios, restricciones e índices anteriores.
- [x] Crear y verificar un respaldo completo fuera del repositorio, con acceso local restringido.
- [x] Aplicar únicamente `20261002_admin_logical_deletion.sql` como propietario de las tablas.
- [x] Verificar columnas, restricciones, índices y conservación de registros e historial.
- [x] Comprobar las consultas públicas que fallaban y las consultas de lectura del panel.

La migración terminó con `COMMIT`; quedaron verificadas las ocho columnas nullable,
las diez restricciones validadas y los dos índices únicos válidos. Los recuentos
anteriores y posteriores coinciden: 15 centros, 76 establecimientos y ningún cambio
en opiniones, versiones ni las tres tablas de auditoría.

La consulta pública de catastro cercano y una tesela de Guaranda pasaron de HTTP 500
a HTTP 200, con sobre JSON y MIME vectorial correctos. Las consultas de Resumen,
Opiniones y los cinco catálogos se ejecutaron en una transacción de solo lectura sin
errores. El esquema conserva los datos existentes; no se usaron seeds ni una
reconstrucción de la base. La comprobación visual del panel requiere recargar la
sesión del navegador.
