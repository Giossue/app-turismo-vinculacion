---
name: create-migration
description: Crea o revisa migraciones SQL PostgreSQL/PostGIS de la API cuando un cambio autorizado requiere esquema, backfill o catálogos.
---

# Evolucionar el esquema

Leer [datos](../../../docs/architecture/database.md), el cambio y el
[procedimiento SQL](../../../database/migrations/README.md). Las migraciones
incrementales ya existen; TypeORM synchronize y Prisma no administran este esquema.

Conservar códigos, soft delete, auditoría, snapshots y aislamiento de publicación.
Usar SQL parametrizado en aplicación, constraints, índices y límites de locks
según el acceso real. Inventariar referencias antes de transformar datos.

Para backfill o cambios destructivos, registrar precondiciones, lotes, respaldo,
compatibilidad, orden de despliegue y estrategia de avance/reversión explícita.
Mantener seeds idempotentes sin insertar credenciales o datos demo por defecto.

Una operación de producción requiere alcance solicitado, conexión y propietario
verificados, respaldo y revisión posterior de historial/esquema/permisos. Consumir
pgpass local solo en memoria; nunca mostrarlo ni copiarlo. No ejecutar runners
locales, wipes, fresh, seeds de demo o rollback automático sobre producción.

Preparar cobertura de migración; ejecutarla cuando se solicite. SQLite o una
validación sintáctica no demuestra PostGIS ni permisos del despliegue.
