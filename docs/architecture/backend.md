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

El módulo `admin` es la frontera de captura y publicación: solo acepta el rol
`ADMINISTRADOR`, conserva borradores versionados, valida catálogos técnicos y coordina las
transacciones de revisión, publicación y auditoría. El panel web nunca consulta PostgreSQL
directamente.

El módulo `files` valida multimedia multipart (límite, MIME y firma), genera claves opacas,
escribe en almacenamiento local de desarrollo o S3/MinIO, y conserva en PostgreSQL solo
metadatos, checksum, estado y auditoría. La lectura pública exige simultáneamente archivo
`PUBLICADO` y centro publicado/activo.
