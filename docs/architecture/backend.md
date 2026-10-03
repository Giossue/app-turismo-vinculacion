# Arquitectura del backend

## Forma

NestJS/Fastify como monolito modular. Cada módulo expone casos de uso y mantiene sus
entidades, repositorios e integraciones. El worker reutiliza la capa de aplicación sin
importar controladores HTTP.

## Capas

### Dominio

Entidades, objetos de valor, invariantes, políticas y errores. Sin NestJS, TypeORM,
Redis, proveedor de mapas/rutas ni SDK de IA.

### Aplicación

Casos de uso, DTO internos, puertos, transacciones y eventos de dominio. Recibe la
identidad como datos simples y no como request HTTP.

### Adaptadores

Controladores, guards, repositorios TypeORM, SQL PostGIS, colas, almacenamiento y
clientes externos.

## Convenciones REST

- Prefijo `/api/v1`.
- Éxito: `{ "data": ..., "meta": ... }` cuando exista metadata.
- Error: `{ "error": { "code": "...", "message": "...", "details": ... } }`.
- Cursores para feeds/mapa; paginación estable para tablas administrativas.
- `Idempotency-Key` en importaciones, publicación y operaciones costosas.
- ETag/Cache-Control para catálogos y fichas públicas.
- OpenAPI es el contrato de clientes; toda ruptura exige versión o migración coordinada.

## Transacciones

Una transacción cubre la operación de negocio completa: aprobación y aplicación de una
revisión, recálculo de valoración/código, auditoría y outbox. Las llamadas externas no se
mantienen dentro de una transacción de base.

## Trabajos

BullMQ procesa importaciones, miniaturas, transcodificación, audioguías, notificaciones e
indexación semántica. Cada trabajo declara idempotencia, reintentos con backoff, timeout,
estado y estrategia de fallo definitivo.

## Caché

Cache-aside en Redis solo para datos públicos costosos. Invalidar por evento de
publicación. La ausencia de Redis degrada rendimiento, no integridad.

## Paquetes offline

El módulo `offline` expone únicamente lectura pública de ciudades y manifiestos publicados:
`GET /api/v1/offline/cities` y `GET /api/v1/offline/cities/:slug/manifest`. El manifiesto se
construye desde PostgreSQL/PostGIS y solo incluye centros publicados y versiones de rutas
marcadas `PUBLICADA`. La generación, revisión y publicación del paquete requiere el flujo
administrativo autenticado; el móvil no escribe en estas tablas.

## Módulos iniciales

`auth`, `users`, `roles`, `territory`, `tourism-catalog`, `centers`, `admin`, `pois`,
`establishments`, `publication`, `files`, `transport`, `reviews`, `favorites`,
`audit`, `health`.

El módulo `admin` es la frontera de captura y publicación: acepta `AGENTE_TURISTICO` para
capturar sus propios borradores y `ADMINISTRADOR` para el ámbito global, revisión,
publicación, catálogos y auditoría. El panel web nunca consulta PostgreSQL directamente.

`GET /admin/navigation-summary` entrega `{ pending, latestChange }` por sección del
sidebar, sin datos de registros ni estado de lectura. Revisión suma centros efectivos
`EN_REVISION` y catastros `EN_REVISION`; Opiniones cuenta opiniones vivas con una versión
pendiente; Centros cuenta estados efectivos `BORRADOR`/`EN_REVISION` y Catastro
`BORRADOR`/`RECHAZADO`/`EN_REVISION`. Catálogos sólo entrega la última modificación auditada
de sus cinco catálogos administrables y `pending=0`. Los registros eliminados no cuentan
como pendientes, pero sus fechas históricas se conservan para detectar cambios.
Administradores reciben todas las señales; agentes sólo las de sus propios centros y
catastros, con las otras secciones vacías. El endpoint usa sesión y roles institucionales,
una consulta agregada y `Cache-Control: private, no-store`; no requiere migración.

Los centros usan `BORRADOR`, `EN_REVISION` y `PUBLICADO`. `PATCH /admin/centers/:code/review`
con `APPROVE` valida y publica el snapshot congelado en la misma transacción que multimedia,
valoración y auditorías `APROBAR`/`PUBLICAR`; `REJECT` exige motivo y devuelve el borrador a
`BORRADOR`. Las propuestas no alteran la versión pública anterior. `deactivate` y
`reactivate` cambian sólo `activo`; `GET /admin/centers` filtra estado y `active` por separado.
La cola incluye únicamente `EN_REVISION`. El endpoint antiguo `publish` admite sólo la
repetición de una publicación ya completada y no permite publicar una propuesta pendiente.

El módulo `files` valida multimedia multipart (límite, MIME y firma), genera claves opacas,
escribe en almacenamiento local de desarrollo o S3/MinIO, y conserva en PostgreSQL solo
metadatos, checksum, estado y auditoría. La lectura pública exige simultáneamente archivo
`PUBLICADO` y centro publicado/activo.

El módulo `opinions` expone la lectura pública de versiones aprobadas y separa las
operaciones autenticadas del visitante (`GET/POST/PATCH /opinions/...`) de la cola
administrativa (`GET/PATCH /admin/opinions`). El servicio autoriza por identidad antes de
editar, usa transacciones para cambiar la versión publicada y registra cada aprobación o
rechazo en `moderaciones_opinion`.
