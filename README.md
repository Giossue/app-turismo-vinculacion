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

Antes de cada módulo posterior, crear una especificación en `docs/product/features/` y
un plan en `docs/plans/active/`.
