# Mapa de arquitectura

## Estilo

Monorepo con monolito modular en el backend, dos clientes y trabajadores asíncronos:

```text
apps/mobile (React Native + Expo)
  turistas + captura de campo para guías
             │
             ▼
apps/api (NestJS/Fastify) ◄──────── apps/web (Next.js)
             │                     web pública + administración
      ┌──────┼──────────┬──────────────┐
      ▼      ▼          ▼              ▼
 PostgreSQL Redis   MinIO/S3      Proveedores externos
 PostGIS     │      multimedia    MapLibre, rutas, IA, correo,
 pgvector    ▼                    clima y notificaciones
          workers                 MapLibre, rutas, IA, correo,
                                  clima y notificaciones
```

## Componentes

- `apps/mobile`: Android/iOS con React Native/Expo, mapa MapLibre, descubrimiento, IA y captura de campo.
- `apps/web`: web pública indexable y panel de guías, revisores y administradores.
- `apps/api`: identidad, permisos, dominio, API REST, orquestación e integraciones.
- `apps/worker`: importaciones, multimedia, IA diferida y notificaciones.
- `packages/contracts`: esquemas y cliente TypeScript derivados de OpenAPI.
- `database`: migraciones, seeds y documentación derivada cuando se inicialice el código.
- `infra`: contenedores, proxy, observabilidad y respaldos.

## Dirección de dependencias del backend

```text
domain <- application <- adapters (HTTP, DB, queues, providers)
```

- Dominio no importa NestJS, TypeORM, Redis ni SDKs externos.
- Aplicación coordina casos de uso y transacciones mediante puertos.
- Adaptadores implementan persistencia, HTTP, almacenamiento, mapas/rutas e IA.
- Controladores no contienen reglas de negocio.

## Módulos de dominio

Identidad, territorio, catálogo turístico, centros, puntos de interés, establecimientos,
fichas, publicación, transporte, rutas, navegación, accesibilidad, multimedia, opiniones,
favoritos, itinerarios, IA, notificaciones, importaciones, valoración y auditoría.

## Fuentes de verdad

- Requisitos: `docs/product/`.
- Arquitectura: `docs/architecture/` y ADRs.
- Esquema conceptual: `temp/db.md`.
- Bootstrap SQL actual: `turismo_vinculacion_app.sql`.
- Al existir la aplicación, las migraciones versionadas serán la fuente ejecutable del esquema.

## Límites críticos

- Cliente/API: HTTPS, autenticación, autorización y validación.
- API/base: transacciones y repositorios; sin acceso directo desde clientes.
- API/mapas y rutas: credenciales con alcance mínimo, control de consumo y proveedor reemplazable.
- API/IA: herramientas permitidas, contexto publicado y fuentes trazables.
- API/archivos: subida firmada o mediada, validación y autorización.
- API/colas: trabajos idempotentes, reintentos y estado persistente.
