# ADR-0003: PostgreSQL/PostGIS con TypeORM y SQL aislado

- Estado: aceptada
- Fecha: 2026-09-16

## Contexto

Existe un modelo relacional extenso y se requieren tipos/consultas PostGIS, triggers e
índices especializados.

## Decisión

Usar TypeORM para relaciones, unidades de trabajo y migraciones, con SQL parametrizado
aislado para operaciones espaciales complejas. Las migraciones serán la fuente ejecutable.

## Consecuencias

- Conserva capacidades nativas de PostgreSQL.
- Repositorios evitan filtrar detalles TypeORM al dominio.
- Las consultas SQL especiales requieren pruebas de integración y documentación.
