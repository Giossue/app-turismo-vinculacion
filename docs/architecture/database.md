# Arquitectura de datos

## Tecnologías

- PostgreSQL como base principal.
- PostGIS para `POINT`, futuros `LINESTRING`, distancias y búsquedas por radio.
- `pg_trgm` para nombres y descripciones.
- pgvector opcional para recuperación semántica.
- TypeORM para mapeo/transacciones y migraciones versionadas.
- SQL parametrizado para consultas espaciales que TypeORM no exprese con claridad.

## Fuentes actuales

- `temp/db.md`: modelo conceptual detallado.
- `turismo_vinculacion_app.sql`: bootstrap inicial verificable.
- `answers.md`: decisiones de producto que requieren extensiones futuras.

Cuando existan migraciones, estas serán la fuente ejecutable. El SQL raíz se conservará
como snapshot/bootstrap generado o se retirará mediante una decisión explícita.

## Reglas

- IDs internos `BIGINT`; códigos públicos derivados cuando corresponda.
- `TIMESTAMPTZ` y almacenamiento UTC; presentación en zona del usuario.
- Eliminación lógica para usuarios y centros.
- Catálogos utilizados conservan sus filas y relaciones; se desactivan o eliminan lógicamente.
- FKs de catálogo con `RESTRICT`; detalles exclusivos con `CASCADE`; referencias
  opcionales históricas con `SET NULL` según diseño.
- Todas las FKs consultadas se indexan.
- Publicación, valoración, código y auditoría se actualizan transaccionalmente.
- `borradores_centros_turisticos` conserva un snapshot JSONB versionado por centro; no
  reemplaza la fila pública hasta que una revisión aprobada se publica.
- Coordenadas validadas y sincronizadas con `GEOGRAPHY`.

## Extensiones pendientes del producto

Crear mediante migraciones cuando su feature se especifique:

- instituciones y membresías;
- creador/responsable de ficha;
- límites oficiales de ciudades, versiones `LINESTRING` de rutas registradas y metadatos de
  paquetes offline (migración `20260917_offline_routes_and_city_packages.sql`);
- consentimientos y dispositivos push;
- eventos, alertas y fuentes meteorológicas;
- audioguías, traducciones y variantes multimedia;
- lotes y errores de importación.

La migración `20260924_tourism_agent_saved_content.sql` crea planes del usuario con
jornadas y paradas y añade consentimiento explícito, identificador público y fuentes
para el historial del agente. Las conversaciones anteriores quedan fuera del historial
voluntario. La API debe desplegarse después de aplicar esta migración.

## Migraciones

`20261003_center_three_state_workflow.sql` desacopla `activo` de `estado_resenia_id` en el
trigger que prepara códigos institucionales. Los estados activos son `BORRADOR`,
`EN_REVISION` y `PUBLICADO`; conserva las filas históricas de los códigos antiguos.
Las aprobaciones sin publicar crean una solicitud nueva con el snapshot congelado y vuelven
a revisión; los rechazos vuelven a borrador. Un inactivo recupera el estado de publicación
anterior usando `publicado_at`, manteniendo `activo=false`. Las revisiones y auditorías
previas no se reescriben, y ningún snapshot se publica por SQL. Es idempotente y requiere
API compatible, respaldo y pausa de mutaciones para desplegarla.

`20261002_seed_national_localities.sql` completa el catálogo de 1.046 referencias del INEC
2026 (222 cabeceras y 824 parroquias rurales de 24 provincias), omitiendo las zonas
del código provincial `90`. Los nombres provienen de la cabecera/parroquia oficial,
no del nombre del cantón. Añade el cantón `14/13 Sevilla Don Bosco` requerido por
esta fuente y conserva la DPA y los códigos históricos de las fichas. Las altas no
incluyen coordenadas, ya que la fuente no las contiene, y todas las localidades
existentes conservan sus IDs, posiciones, nombres y activación. El snapshot original
y su procedencia viven en `database/catalogs/` y el generador no requiere acceso a
la base ni dependencias adicionales.

`20261002_admin_logical_deletion.sql` distingue eliminación de desactivación con
`eliminado_at` en centros, establecimientos, opiniones y los cinco catálogos del panel.
Las eliminaciones se auditan con `ELIMINAR` en la misma transacción y conservan las FKs
y los identificadores. Los registros eliminados se excluyen de los listados operativos,
no pueden reactivarse, y quedan fuera de las calificaciones públicas. Los centros y
catastros conservan sus códigos y números de registro; las opiniones nuevas pueden
reemplazar una raíz eliminada gracias a los índices de unicidad de registros vigentes.

- Una migración por cambio coherente.
- Toda migración destructiva incluye inventario, respaldo, transformación y rollback.
- Probar desde cero y sobre una copia anonimizada representativa.
- Índices grandes se crean de forma compatible con operación (`CONCURRENTLY` cuando aplique).
- Seeds idempotentes para DPA, catálogos y roles; no insertar contraseñas reales.
- El catálogo XLSM de valoración vive en `database/seeds/003_xlsm_valuation_indicators.sql`:
  es una carga de datos manual, sin DDL, y se aplica únicamente después de verificar los
  criterios A-I. Hasta entonces la API conserva la jerarquía provisional `00`.

## Consultas críticas

- Centros publicados dentro de viewport/radio.
- Búsqueda por nombre, clasificación, accesibilidad y servicios.
- Ficha pública completa por código.
- Rutas/paradas asociadas a un centro.
- Cola de revisiones por estado/fecha.
- Borradores administrativos y revisiones propuestas por centro.
- Favoritos y opiniones del usuario.
- Fuentes publicadas para IA.

## Opiniones y moderación

`opiniones` representa la relación lógica entre una cuenta y un centro o punto de
interés. El contenido moderable vive en `opinion_versiones`: solo una versión con
estado `APROBADA` puede estar referenciada por `opiniones.version_publicada_id` y ser
visible públicamente. Una edición crea una nueva versión `PENDIENTE`; mientras se
revisa, la versión aprobada anterior permanece publicada. Si la edición se rechaza,
la versión anterior se conserva; si se aprueba, la anterior pasa a `REEMPLAZADA`.

No existe el estado `OCULTA` en el flujo nuevo. Un rechazo inicial deja la opinión
lógica fuera de la consulta pública y permite al visitante enviar otra opinión. Cada
decisión se registra en `moderaciones_opinion` con el `opinion_version_id`, actor,
acción y motivo.

Cada consulta crítica debe acompañarse de `EXPLAIN (ANALYZE, BUFFERS)` con volumen
representativo antes de optimizar.
