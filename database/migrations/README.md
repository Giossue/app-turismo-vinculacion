# Migraciones de PostgreSQL/PostGIS

El baseline `00000000000000_initial.sql` delega en el snapshot revisado
`turismo_vinculacion_app.sql`. Debe ejecutarse con `psql` desde una base vacía, porque
el snapshot crea la base `turismo_vinculacion_app`, habilita PostGIS/pg_trgm y crea las
tablas, funciones, índices y catálogos mínimos.

Las modificaciones posteriores se añaden como archivos SQL incrementales ordenados por
fecha. No se edita el baseline después de que un entorno compartido lo haya ejecutado.

No ejecutar migraciones con el ORM en modo `synchronize`; PostgreSQL/PostGIS es la
fuente de verdad del esquema.

La migración `20260917_offline_routes_and_city_packages.sql` añade límites oficiales de
ciudades, versiones publicables de rutas y metadatos de paquetes offline. Debe ejecutarse
después del baseline y antes de habilitar descargas en el móvil.

La migración `20260917_admin_auth_sessions.sql` añade sesiones de refresh rotatorias para
el panel institucional. Debe ejecutarse después del baseline y antes de habilitar login
en `web-turismo-admin`. No crea contraseñas ni usuarios administradores.

La migración `20260918_consolidate_auth_roles.sql` deja únicamente los roles
`ADMINISTRADOR` y `TURISTA`. Las cuentas que tuvieran `REVISOR` o `GESTOR` conservan su
identidad y reciben `ADMINISTRADOR` antes de retirar las asignaciones y roles obsoletos.

La migración `20260918_admin_center_drafts.sql` agrega snapshots JSONB versionados para
separar borradores administrativos del contenido público. Debe ejecutarse después del
baseline y de la migración de roles.

La migración `20260918_admin_center_technical_catalogs.sql` carga catálogos mínimos
idempotentes para actividades, accesibilidad y facilidades, necesarios para completar
el editor administrativo local. Los catálogos siguen siendo datos administrables y no
deben sustituirse por listas codificadas en la interfaz.

La migración `20260918_admin_catalog_audit.sql` añade la auditoría inmutable de cambios
de nombre y activación de esos catálogos.

La migración `20260918_admin_center_media.sql` agrega estado, responsables de
carga/eliminación e índices a los metadatos de archivos. Los binarios se guardan en
almacenamiento local de desarrollo o S3/MinIO; nunca se incrustan en PostgreSQL. Las
fotografías no son visibles al turista hasta publicar la ficha.

La migración `20260918_seed_guaranda_demo_content.sql` completa las cinco fichas públicas
de Guaranda con descripciones, ingreso referencial, actividades, accesibilidad y
facilidades. También registra metadatos de cinco imágenes JPEG generadas para prototipo;
los objetos correspondientes se copian desde `assets/seed-tourism-media/` a
`apps/api/.data/media/` mediante `scripts/seed-guaranda-demo-media.sh` en el entorno local. Estas imágenes deben sustituirse por
fotografías institucionales antes de producción.

La migración `20260919_seed_guaranda_six_centers.sql` carga seis centros y sus catálogos
territoriales mínimos con coordenadas distribuidas alrededor de Guaranda. Son registros de
demostración para validar el mapa y deben sustituirse por fichas institucionales verificadas.
