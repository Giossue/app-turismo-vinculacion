# Turismo Vinculación App

Plataforma turística institucional orientada inicialmente a Guaranda y diseñada para
escalar a todo Ecuador. Combina información turística validada, mapas, transporte,
navegación e inteligencia artificial con un flujo formal de registro,
revisión y publicación.

Este monorepo contiene la API NestJS y el cliente móvil Expo, migraciones SQL y
herramientas de desarrollo. Conserva el scaffold `apps/web` del primer corte público;
el panel institucional vigente vive en el repositorio separado `web-turismo-admin`.

## Knowledge: CognitiveStack y OpenSpec

El knowledge adapta CognitiveStack `dev` al stack actual. Empieza por
[AGENTS.md](AGENTS.md), [el índice](docs/README.md) y [ARCHITECTURE.md](ARCHITECTURE.md).
La [revisión de adopción](docs/architecture/cognitivestack-adoption.md) registra fuente,
contratos y diferencias. OpenSpec contiene specs, propuestas y cambios archivados;
la planificación anterior se conserva en el historial Git.

```bash
corepack pnpm openspec list --json
corepack pnpm openspec validate --all --strict --no-interactive
corepack pnpm knowledge:init
corepack pnpm knowledge:update
```

La [instalación](docs/quality/openspec-installation.md) usa OpenSpec 1.14.1 global
y local, las integraciones de Codex y Claude y los doce workflows. El wrapper
mantiene ese perfil sin modificar preferencias globales y desactiva telemetría.
No editar las skills ni comandos generados.

## Stack acordado

- React Native + Expo + MapLibre para Android/iOS.
- Next.js/MUI en el repositorio del panel; scaffold público Next.js conservado aquí.
- NestJS/Fastify para API.
- PostgreSQL/PostGIS y almacenamiento local o S3/MinIO; Redis/BullMQ previstos.
- IA consumida exclusivamente desde el backend.

## Estado local actual

El primer corte vertical está disponible: un centro publicado de desarrollo en Guaranda
se consulta desde PostgreSQL/PostGIS mediante la API y se muestra en la web pública.
La especificación del primer corte está en `docs/product/features/public-centers/`;
su resultado histórico se conserva en el
[registro Git](https://github.com/Giossue/app-turismo-vinculacion/blob/91736d206fe194838f07fb72b45c95411f6e75d2/docs/plans/completed/2026-09-16-bootstrap-primer-corte.md).

El arranque local recomendado usa el Compose de `infra/docker/compose.local.yml`. El
script levanta PostgreSQL/PostGIS en `127.0.0.1:55433`, aplica el baseline y las
migraciones, inicia la API y arranca el panel administrativo independiente.

```bash
# Un único comando para PostgreSQL, API y panel admin
corepack pnpm dev:local

# URLs locales
# Admin: http://localhost:3002/admin
# API: http://localhost:3000/api/v1
# OpenAPI: http://localhost:3000/api/docs

# Cliente móvil Android: consultar apps/mobile/README.md
corepack pnpm --filter @turismo/mobile android
```

Para detener con seguridad todos los procesos del entorno local, ejecuta:

```bash
corepack pnpm dev:local:stop
```

El volumen de datos se conserva. Si no existe una cuenta institucional, créala una vez
con el comando documentado en el README del panel administrativo.

El agente turístico se habilita solo en la API. Copia las variables de `.env.example` y
elige `AI_PROVIDER=openai` o `AI_PROVIDER=anthropic`, junto con el `AI_MODEL` y la clave
del proveedor correspondiente. Nunca coloques esas claves en `apps/mobile/.env`.

El cliente móvil usa MapLibre y por ello requiere un development build de Expo, no
Expo Go. La configuración de API para emulador y el proceso completo están en
`apps/mobile/README.md`.

Los cambios nuevos no triviales se gestionan en OpenSpec con el
[ciclo de cambios](docs/quality/change-lifecycle.md). La documentación anterior de
features conserva su contexto y se reconcilia al modificar su comportamiento.
