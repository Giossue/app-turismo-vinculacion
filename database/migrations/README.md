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

La migración `20260920_seed_xlsm_fixed_catalogs.sql` carga de forma idempotente los
catálogos fijos del libro institucional de la ficha: 25 provincias, 227 cantones, 1.250
parroquias, 2 categorías, 15 tipos y 79 subtipos. Actualiza y reactiva los códigos
presentes en la fuente y desactiva lógicamente los obsoletos; no elimina filas ni crea
localidades o zonas. La fuente reproducible es `temp/Centro Cultural Indio Guaranga (2).xlsm`
(SHA-256 `137a3c2db2c9b0d94d5590ae7d87e3ea2dea9a59cb9cda7fbb86e116ca0ed8cf`), y el
generador se encuentra en `scripts/generate-xlsm-fixed-catalog-migration.py`.

La migración `20260920_seed_xlsm_operational_catalogs.sql` carga las opciones cerradas
de las secciones operativas del mismo libro: 14 transportes, 51 criterios de
accesibilidad, 20 tipos de planta turística, 5 servicios complementarios, 4 estados y
16 tipos de facilidad en 5 categorías, 4 estados y 22 factores de conservación,
23 servicios básicos, 24 tipos de señalética, 3 materiales,
5 servicios de salud, 4 de seguridad, 8 medios de comunicación, 8 amenazas, 4 preguntas
de política, 56 actividades, 8 medios de promoción y 17 opciones de formación. Es
idempotente, reactiva los códigos fuente y no elimina catálogos técnicos que el panel
pueda haber añadido. No carga el ejemplo de Guaranda, `catalogo_clima`, `materiales_via`,
localidades ni zonas; esos valores se mantienen libres o pertenecen al módulo de
catastro. Usa la misma fuente y SHA-256, y se reproduce con
`scripts/generate-xlsm-operational-catalog-migration.py`.

La migración `20260920_seed_catastro_demo.sql` carga una muestra reproducible del
consolidado nacional: diez establecimientos ratificados de parroquias urbanas por cada
una de las ciudades Guaranda, Riobamba, Ambato, Latacunga y Babahoyo. Crea o reactiva
las cinco localidades como `CIUDAD`, conserva los números de registro oficiales como
clave de upsert y deja vacías dirección, teléfono y coordenadas individuales porque no
son columnas informadas por la fuente. Las coordenadas aproximadas de la cabecera se
guardan en la localidad para probar el fallback territorial. Es idempotente, no elimina
ni desactiva datos fuera de la muestra y se reproduce con
`scripts/generate-catastro-demo-migration.py` desde
`temp/Consolidado-Nacional-2026-publico-8 (1).xlsx`
(SHA-256 `3e5598c95edb2b4dc31ce0f776742e0bea59c146a2d9cb7087e0c47b53374e7d`).

La migración `20260920_establishment_audit.sql` amplía los valores permitidos de la
tabla inmutable existente `auditoria_catalogos` para registrar mutaciones de
`establecimientos_turisticos` con el discriminador `ESTABLISHMENT`. No crea tablas ni
columnas nuevas; conserva el trigger de inmutabilidad y los JSONB de antes/después.

`database/seeds/003_xlsm_valuation_indicators.sql` es un seed de datos manual, no una
migración de esquema. Carga de forma idempotente los 56 indicadores A-I derivados de
`Jerarquia` y `Calculos`; debe ejecutarse solo cuando los nueve criterios de
`criterios_valoracion` estén presentes. La API deja la jerarquía provisional y no calcula
puntajes mientras este catálogo no esté completo, por lo que el seed no se aplica
automáticamente a la base desplegada.
