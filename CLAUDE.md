# Entrada para Claude

Leer [AGENTS.md](AGENTS.md) y [docs/README.md](docs/README.md). Las mismas fuentes
de producto, arquitectura, seguridad y calidad sirven a todos los agentes.

Los escenarios documentados están en `openspec/specs/`; las propuestas y su
historia en `openspec/changes/`. Los ejemplos de CLI se ejecutan con
`corepack pnpm openspec`. Regenerar con `corepack pnpm knowledge:update`.

Conservar el stack React Native/Expo/Paper/MapLibre y NestJS/Fastify/PostGIS.
El panel MUI vive en el repositorio vecino. La solicitud del usuario determina
alcance, pruebas y entrega; las skills no amplían la autorización.
