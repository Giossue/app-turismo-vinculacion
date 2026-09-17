# Turismo Vinculación App

Plataforma turística institucional orientada inicialmente a Guaranda y diseñada para
escalar a todo Ecuador. Combina información turística validada, mapas, transporte,
navegación, itinerarios e inteligencia artificial con un flujo formal de registro,
revisión y publicación.

Este repositorio está en fase de ingeniería y contiene actualmente:

- modelo relacional en `temp/db.md`;
- bootstrap PostgreSQL/PostGIS en `turismo_vinculacion_app.sql`;
- decisiones de producto en `answers.md`;
- kit de contexto para desarrollo asistido por agentes en `AGENTS.md` y `docs/`.

## Stack acordado

- React Native + Expo + MapLibre para Android/iOS.
- Next.js + HeroUI React para web pública y administración.
- NestJS/Fastify para API.
- PostgreSQL/PostGIS, Redis/BullMQ y MinIO.
- IA consumida exclusivamente desde el backend.

## Estado local actual

El primer corte vertical está disponible: un centro publicado de desarrollo en Guaranda
se consulta desde PostgreSQL/PostGIS mediante la API y se muestra en la web pública.
La especificación y resultado están en
`docs/product/features/public-centers/` y
`docs/plans/completed/2026-09-16-bootstrap-primer-corte.md`.

La instancia local se ejecuta en Podman porque el PostgreSQL del sistema no tenía la
extensión PostGIS. Está aislada en `127.0.0.1:55433`, con autenticación de confianza
solo para desarrollo local. Su definición está en `infra/docker/compose.local.yml`.

```bash
# Iniciar la base local si todavía no está activa
podman start turismo-vinculacion-postgres

# Verificar el workspace
corepack pnpm verify

# En terminales separadas
corepack pnpm dev:api
corepack pnpm dev:web

# Cliente móvil Android: consultar apps/mobile/README.md
corepack pnpm --filter @turismo/mobile android
```

La API queda en `http://127.0.0.1:3000/api/v1`, OpenAPI en
`http://127.0.0.1:3000/api/docs` y la web en `http://127.0.0.1:3001`.

El cliente móvil usa MapLibre y por ello requiere un development build de Expo, no
Expo Go. La configuración de API para emulador y el proceso completo están en
`apps/mobile/README.md`.

Antes de cada módulo posterior, crear una especificación en `docs/product/features/` y
un plan en `docs/plans/active/`.
