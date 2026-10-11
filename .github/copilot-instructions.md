Leer `AGENTS.md` y `docs/README.md`. CognitiveStack y OpenSpec comparten fuentes
de producto, arquitectura, calidad y seguridad en este monorepo.

Conservar React Native/Expo/Paper/MapLibre, NestJS/Fastify/PostGIS y pnpm. El panel
MUI vive en `web-turismo-admin`; `apps/web` es un scaffold anterior. No copiar
Express/Prisma/Better Auth/Tailwind de la plantilla ni conectar datos desde clientes.

Los escenarios están en `openspec/specs/`. Usar `corepack pnpm openspec` para los
comandos y `corepack pnpm knowledge:update` para regenerar. La solicitud del usuario
fija alcance, ejecución de pruebas y entrega; las skills no amplían autorización.
