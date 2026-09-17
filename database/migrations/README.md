# Migraciones de PostgreSQL/PostGIS

El baseline `00000000000000_initial.sql` delega en el snapshot revisado
`turismo_vinculacion_app.sql`. Debe ejecutarse con `psql` desde una base vacía, porque
el snapshot crea la base `turismo_vinculacion_app`, habilita PostGIS/pg_trgm y crea las
tablas, funciones, índices y catálogos mínimos.

Las modificaciones posteriores se añaden como archivos SQL incrementales ordenados por
fecha. No se edita el baseline después de que un entorno compartido lo haya ejecutado.

No ejecutar migraciones con el ORM en modo `synchronize`; PostgreSQL/PostGIS es la
fuente de verdad del esquema.
