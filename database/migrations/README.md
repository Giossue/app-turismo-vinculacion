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

La migración `20260920_tourist_registration.sql` añade el índice único case-insensitive
que protege el registro móvil contra alias del mismo correo. Debe ejecutarse después del
baseline y antes de habilitar `POST /auth/mobile/register`; si encuentra correos duplicados
ignorando mayúsculas, se detiene para que operación los resuelva explícitamente.

La migración `20260918_consolidate_auth_roles.sql` deja inicialmente los roles
`ADMINISTRADOR` y `TURISTA`. Las cuentas que tuvieran `REVISOR` o `GESTOR` conservan su
identidad y reciben `ADMINISTRADOR` antes de retirar las asignaciones y roles obsoletos.

La migración `20260922_tourism_agent_review_workflow.sql` añade el rol
`AGENTE_TURISTICO`, vincula centros y catastros con su usuario responsable, y crea el
estado de revisión del catastro. Los nuevos registros de agentes quedan en borrador y no
son públicos hasta la aprobación administrativa; los catastros históricos se conservan
como `PUBLICADO`.

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

La migración `20260920_z3_seed_catastro_demo.sql` carga una muestra reproducible del
consolidado nacional: diez establecimientos ratificados de parroquias urbanas por cada
una de las ciudades Guaranda, Riobamba, Ambato, Latacunga y Babahoyo. Crea o reactiva
las cinco localidades como `CIUDAD`, conserva los números de registro oficiales como
clave de upsert y deja vacías dirección y teléfono porque no son columnas informadas por
la fuente. Copia las coordenadas aproximadas de la cabecera al establecimiento y las
marca con `coordenadas_aproximadas` para probar el descubrimiento territorial sin
presentarlas como ubicación exacta. Es idempotente, no elimina ni desactiva datos fuera
de la muestra y se reproduce con
`scripts/generate-catastro-demo-migration.py` desde
`temp/Consolidado-Nacional-2026-publico-8 (1).xlsx`
(SHA-256 `3e5598c95edb2b4dc31ce0f776742e0bea59c146a2d9cb7087e0c47b53374e7d`).

La migración `20260920_establishment_audit.sql` amplía los valores permitidos de la
tabla inmutable existente `auditoria_catalogos` para registrar mutaciones de
`establecimientos_turisticos` con el discriminador `ESTABLISHMENT`. No crea tablas ni
columnas nuevas; conserva el trigger de inmutabilidad y los JSONB de antes/después.

La migración `20260921_establishment_taxonomy.sql` agrega la taxonomía jerárquica del
catastro: actividad, clasificación y categoría. Se genera desde el consolidado nacional
con `scripts/generate-establishment-taxonomy-migration.py`, normaliza las etiquetas de
categoría conocidas y conserva aliases de los valores fuente. Añade relaciones opcionales
por ID a `establecimientos_turisticos` sin borrar sus columnas de texto, para permitir una
normalización progresiva y trazable.

La migración `20260921_establishment_category_marker_cleanup.sql` reemplaza los iconos
heredados `mapPin` de las categorías de catastro por `hotel`, cambia el valor por defecto
y reserva el pin de lugar para los centros turísticos. La migración
`20260921_establishment_category_palette_cleanup.sql` normaliza colores heredados fuera
de la paleta pública y alinea la restricción con las opciones del panel.

La migración `20260921_establishment_category_z_blue_reserved.sql` reserva el azul para la
ubicación actual: convierte categorías existentes azules a violeta, cambia el valor por
defecto y retira el azul de la paleta administrativa.

La migración `20260921_establishment_category_z_varied_markers.sql` asigna iconos y colores
semánticos a todas las categorías: alojamiento, restaurantes, cafeterías, vida nocturna,
guianza, eventos, agencias y transporte dejan de compartir el marcador de hotel violeta.
Conserva el azul puro reservado para la ubicación actual y es idempotente.

La migración `20260922_establishment_semantic_taxonomy.sql` mueve el perfil visual al nivel
de clasificación/tipo de establecimiento y añade a las categorías el sistema semántico, el
valor numérico cuando existe y una marca de revisión para valores ambiguos del consolidado.
Conserva los campos visuales heredados de categoría para compatibilidad, pero la API nueva y
el mapa leen la configuración de la clasificación. Es aditiva e idempotente.

La migración `20260922_osmic_establishment_pins.sql` traduce los iconos heredados al
catálogo curado de pines Osmic, asigna una paleta fija por icono y sincroniza el perfil
visual heredado de las categorías. Después de ejecutarla, el panel solo debe permitir
seleccionar el icono; el color se calcula en la API y queda protegido por restricciones.

La migración `20260922_reserve_tourism_center_pin.sql` reserva `tourism-monument` para
los centros turísticos. Si existiera alguna clasificación de catastro con ese código,
la devuelve al pin de supermercado y reconstruye la restricción sin el pin reservado.

La migración `20260921_establishment_coordinates_required.sql` completa las coordenadas
faltantes de `establecimientos_turisticos` usando la localidad vinculada, las marca como
`coordenadas_aproximadas` y establece `NOT NULL` en latitud y longitud. Se detiene ante
coordenadas incompletas o localidades sin posición; requiere respaldo previo y debe
ejecutarse antes de desplegar la validación obligatoria del API. Las coordenadas de
localidad no sustituyen la captura posterior de la ubicación exacta del establecimiento.

La migración `20260921_establishment_demo_coordinates_spread.sql` distribuye los 50
establecimientos demostrativos alrededor de Guaranda, Riobamba, Ambato, Latacunga y
Babahoyo para evitar marcadores apilados. Las posiciones continúan marcadas como
aproximadas y no sustituyen la captura institucional de coordenadas exactas. La migración
se detiene si detecta una distribución parcial o datos enriquecidos que podrían ser
sobrescritos.

La migración `20260921_seed_guaranda_nearby_demo_poi.sql` crea un catastro demostrativo a
diez metros del único centro turístico publicado de Guaranda. Permite verificar el zoom y
la sheet de selección de lugares cercanos; se identifica como demo y conserva la marca de
coordenada aproximada.

La migración `20260920_opinions_versions.sql` separa la opinión lógica de sus versiones
moderables. Convierte el contenido histórico de la tabla `opiniones` en la versión 1,
elimina el estado `OCULTA`, conserva una versión aprobada mientras una edición está
pendiente y registra la versión moderada en `moderaciones_opinion`. Requiere respaldo
previo porque elimina las columnas antiguas duplicadas de `opiniones`.

La migración `20260920_z1_seed_guaranda_zone.sql` crea o reactiva una única zona de
demostración (`Entorno de Guaranda`) en la localidad `Guaranda` y dos puntos de interés
con coordenadas y descripciones referenciales. Es idempotente, utiliza solo las tablas
territoriales existentes y no registra fotografías porque el esquema actual relaciona
los metadatos multimedia exclusivamente con `centros_turisticos`.

La migración `20260920_z2_seed_guaranda_ficha.sql` crea la ficha integral demostrativa
`Centro Cultural Indio Guaranga` dentro de esa zona, con código `020101MC010202001`,
valoración A-I `48,7`, jerarquía `02`, datos de ingreso, accesibilidad, planta,
actividades, promoción y tres fotografías PNG publicadas. Es idempotente y reutiliza
las tablas existentes; para el almacenamiento local, `scripts/seed-guaranda-ficha-media.sh`
copia los binarios a `apps/api/.data/media/centers/<id>/photos/`.

La migración `20260921_seed_complete_guaranda_demo_draft.sql` completa únicamente el
snapshot JSONB del borrador existente de `Centro Cultural Indio Guaranga` con las catorce
secciones y datos referenciales de demostración. Ubica la ficha por nombre exacto, reutiliza
catálogos por código, registra auditoría, conserva revisiones históricas y no altera el
contenido público ni crea binarios multimedia.

`database/seeds/003_xlsm_valuation_indicators.sql` es un seed de datos manual, no una
migración de esquema. Carga de forma idempotente los 56 indicadores A-I derivados de
`Jerarquia` y `Calculos`; debe ejecutarse solo cuando los nueve criterios de
`criterios_valoracion` estén presentes. La API deja la jerarquía provisional y no calcula
puntajes mientras este catálogo no esté completo, por lo que el seed no se aplica
automáticamente a la base desplegada.
