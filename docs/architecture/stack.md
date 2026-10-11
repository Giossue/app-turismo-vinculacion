# Stack aprobado

## Monorepo

- `pnpm` mediante Corepack para TypeScript.
- Expo/React Native comparte el workspace `pnpm` con API y web.
- Turborepo puede coordinar las aplicaciones TypeScript cuando el volumen lo justifique.
- Versiones en los manifiestos y `pnpm-lock.yaml`; las actualizaciones son cambios separados.
- OpenSpec 1.14.1 es una dependencia de desarrollo en la raíz, con perfil completo
  en `openspec/tooling.json`. No pertenece al runtime de la API o del móvil.

## Móvil

- React Native, Expo y TypeScript estricto.
- Expo Router para rutas, enlaces y estructura de pantallas.
- MapLibre React Native como renderer nativo; requiere Expo Development Build, no Expo Go.
- TanStack Query para estado remoto y cancelación de consultas.
- Estado local en React y contratos Zod declarados por feature. Zustand y React
  Hook Form no están instalados en este paquete; el panel usa su propio formulario.
- React Native Paper como kit externo de componentes; los tokens y componentes `Tourism*`
  mantienen la identidad visual, mientras `StyleSheet` resuelve el layout nativo.
- `@gorhom/bottom-sheet` sobre Gesture Handler/Reanimated para sheets con arrastre continuo
  desde el contenido y scroll coordinado; no actúa como kit visual.
- Los fondos flotantes `TourismGlass*` se implementan con `View`, colores translúcidos
  del tema y bordes. Conservan la estética de vidrio sin desenfoque, capturas del fondo
  ni referencias a vistas objetivo; `expo-blur` no forma parte de las dependencias.
- expo-secure-store para credenciales mínimas; caché/drafts solo cuando se especifique.
- expo-notifications y Sentry cuando la feature los requiera.

## Web y panel

- El panel vigente es Next.js/React/TypeScript/MUI, con Bun, en `web-turismo-admin`.
- `apps/web` conserva un scaffold público Next.js. HeroUI y Tailwind no están instalados.
- La aplicación móvil es el producto para turistas; el futuro del scaffold se
  decide explícitamente, sin eliminarlo o convertirlo por adoptar la plantilla.

## Backend

- Node.js LTS, TypeScript y NestJS.
- Adaptador Fastify.
- REST, OpenAPI y eventos asíncronos; WebSockets solo con caso de uso real.
- Zod en fronteras y variables de entorno.
- TypeORM para unidades de trabajo y relaciones; SQL parametrizado aislado para PostGIS.
- Guards Nest propios y JWT con `jose` para identidad y autorización; no Passport.
- Argon2id para contraseñas.
- Redis/BullMQ previstos; sin worker o colas de aplicación instalados. El rate
  limit actual usa Fastify y requiere diseño distribuido si se escala.

## Datos

- PostgreSQL como fuente permanente.
- PostGIS para puntos, líneas, radios y cercanía.
- `pg_trgm` para búsqueda textual tolerante.
- pgvector solo cuando exista un caso semántico medido.
- MinIO/S3 para contenido binario.

## Operación

- Docker Compose en servidor propio.
- Caddy o Nginx para TLS y proxy.
- Backups de PostgreSQL y objetos probados mediante restauración.
- OpenTelemetry, Sentry y métricas son criterios de evolución; esta adopción no
  demuestra que esa instrumentación esté desplegada.

La conservación y procedencia están en [ADR 0005](adr/0005-cognitivestack-openspec.md).

## Decisiones excluidas

- Flutter/ArcGIS Flutter: descartado porque el SDK no admite Linux como host de desarrollo.
- Prisma: no es la opción base por el uso intensivo de PostGIS y el esquema SQL existente.
- Microservicios: no existe necesidad demostrada.
- Guardar archivos binarios en PostgreSQL: excluido.
