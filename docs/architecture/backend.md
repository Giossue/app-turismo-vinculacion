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
- Diseñar repetición y concurrencia por operación. No existe un contrato general
  de `Idempotency-Key` en esta API; ver [idempotency.md](idempotency.md).
- ETag/Cache-Control para catálogos y fichas públicas.
- OpenAPI es el contrato de clientes; toda ruptura exige versión o migración coordinada.

## Transacciones

Una transacción cubre la operación de negocio completa: aprobación y aplicación de una
revisión, recálculo de valoración/código y auditoría según el flujo implementado.
Outbox es una opción futura. Las llamadas externas no deben mantenerse dentro de
una transacción de negocio; revisar límites y consistencia en cada caso.

## Trabajos

Redis/BullMQ y los workers separados son arquitectura prevista, no módulos
registrados actualmente. Cuando se implemente un job, declarar idempotencia,
reintentos, timeout, estado durable y fallo definitivo. El parser de ficha del
panel vive en su repositorio y no es un consumidor BullMQ.

## Caché

Si se incorpora Redis, usarlo para datos públicos costosos y diseñar invalidación.
PostgreSQL conserva la fuente permanente. No afirmar caché Redis existente por
la presencia de un servicio en Compose.

## Paquetes offline

El módulo `offline` expone únicamente lectura pública de ciudades y manifiestos publicados:
`GET /api/v1/offline/cities` y `GET /api/v1/offline/cities/:slug/manifest`. El manifiesto se
construye desde PostgreSQL/PostGIS y solo incluye centros publicados y versiones de rutas
marcadas `PUBLICADA`. La generación, revisión y publicación del paquete requiere el flujo
administrativo autenticado; el móvil no escribe en estas tablas.

## Módulos actuales

`app.module.ts` registra health, centers, ai, offline, auth, admin, files, routing,
establishments, favorites, opinions y search. Otros módulos del mapa conceptual
son posibles cortes futuros; no se instalan por adoptar el knowledge.

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

## Variantes de fotografías públicas

`GET /api/v1/media/:id` y `GET /api/v1/media/establishments/:id` admiten opcionalmente
`size=thumbnail|preview`, con anchos máximos 640/1280 y sin ampliar imágenes pequeñas.
El tamaño inválido responde 400; sin parámetro conserva el archivo existente. La variante
WebP usa Sharp ya instalado y conserva proporciones. La publicación y vigencia del registro
se comprueban por el servicio antes de acceder a cualquier variante; el caché no autoriza
una fotografía retirada. Las imágenes admitidas que no pueden transformarse o llegan cuando
hay dos transformaciones distintas en curso conservan su original válido.

Las variantes viven en una caché local al proceso, identificadas por SHA-256 del contenido
y tamaño: máximo 16 MiB, 128 entradas y una hora, con expulsión LRU y deduplicación concurrente.
No se escribe una variante en MinIO/S3 ni se cambia PostgreSQL. Cada solicitud conserva
la consulta de visibilidad y la lectura del objeto; el ahorro principal es transferencia
al cliente y transformación repetida, sin afirmar ahorro de consultas a la base.
El cache HTTP conserva `public, max-age=3600`; retirar publicación no revoca una copia
que el cliente ya recibió bajo esa política. El contrato está implementado en código y
OpenAPI; requiere desplegar la API para servir imágenes reducidas al móvil.
