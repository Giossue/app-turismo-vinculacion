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
- Catálogos utilizados se desactivan, no se borran.
- FKs de catálogo con `RESTRICT`; detalles exclusivos con `CASCADE`; referencias
  opcionales históricas con `SET NULL` según diseño.
- Todas las FKs consultadas se indexan.
- Publicación, valoración, código y auditoría se actualizan transaccionalmente.
- Coordenadas validadas y sincronizadas con `GEOGRAPHY`.

## Extensiones pendientes del producto

Crear mediante migraciones cuando su feature se especifique:

- instituciones y membresías;
- creador/responsable de ficha;
- geometría `LINESTRING` de rutas registradas;
- itinerarios, jornadas y paradas;
- preferencias e historial controlado;
- consentimientos y dispositivos push;
- eventos, alertas y fuentes meteorológicas;
- audioguías, traducciones y variantes multimedia;
- fuentes/citas de respuestas de IA;
- lotes y errores de importación.

## Migraciones

- Una migración por cambio coherente.
- Toda migración destructiva incluye inventario, respaldo, transformación y rollback.
- Probar desde cero y sobre una copia anonimizada representativa.
- Índices grandes se crean de forma compatible con operación (`CONCURRENTLY` cuando aplique).
- Seeds idempotentes para DPA, catálogos y roles; no insertar contraseñas reales.

## Consultas críticas

- Centros publicados dentro de viewport/radio.
- Búsqueda por nombre, clasificación, accesibilidad y servicios.
- Ficha pública completa por código.
- Rutas/paradas asociadas a un centro.
- Cola de revisiones por estado/fecha.
- Favoritos y opiniones del usuario.
- Fuentes publicadas para IA.

Cada consulta crítica debe acompañarse de `EXPLAIN (ANALYZE, BUFFERS)` con volumen
representativo antes de optimizar.
