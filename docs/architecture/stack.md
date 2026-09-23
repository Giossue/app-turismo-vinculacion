# Stack aprobado

## Monorepo

- `pnpm` mediante Corepack para TypeScript.
- Expo/React Native comparte el workspace `pnpm` con API y web.
- Turborepo puede coordinar las aplicaciones TypeScript cuando el volumen lo justifique.
- Versiones exactas se fijan al hacer bootstrap y se actualizan mediante cambios separados.

## Móvil

- React Native, Expo y TypeScript estricto.
- Expo Router para rutas, enlaces y estructura de pantallas.
- MapLibre React Native como renderer nativo; requiere Expo Development Build, no Expo Go.
- TanStack Query para estado remoto y cancelación de consultas.
- Zustand para estado local efímero; React Hook Form y Zod para formularios.
- React Native Paper como kit externo de componentes; los tokens y componentes `Tourism*`
  mantienen la identidad visual, mientras `StyleSheet` resuelve el layout nativo.
- `@gorhom/bottom-sheet` sobre Gesture Handler/Reanimated para sheets con arrastre continuo
  desde el contenido y scroll coordinado; no actúa como kit visual.
- `expo-blur` (SDK 57, MIT, mantenido por Expo) solo para el desenfoque de la barra inferior
  flotante (`TourismTabBar`). En iOS usa el material nativo; en Android usa
  `dimezisBlurViewSdk31Plus` sobre un `BlurTargetView` y en Android 11 o inferior cae a un
  tinte semitransparente. Superficie de riesgo: módulo nativo (requiere recompilar el
  binario) y coste de GPU en Android; no procesa datos.
- expo-secure-store para credenciales mínimas; caché/drafts solo cuando se especifique.
- expo-notifications y Sentry cuando la feature los requiera.

## Web futura

- La web pública y administrativa se desarrollará en un repositorio separado.
- Este monorepo no mantiene un kit visual ni una cadena de estilos utilitarios para la web.
- Las decisiones de UI, estilos y dependencias de ese repositorio se tomarán cuando se cree.

## Backend

- Node.js LTS, TypeScript y NestJS.
- Adaptador Fastify.
- REST, OpenAPI y eventos asíncronos; WebSockets solo con caso de uso real.
- Zod en fronteras y variables de entorno.
- TypeORM para unidades de trabajo y relaciones; SQL parametrizado aislado para PostGIS.
- Passport/Nest guards para identidad y autorización.
- Argon2id para contraseñas.
- Redis + BullMQ para colas, rate limits y caché.

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
- OpenTelemetry, logs estructurados y Sentry; Prometheus/Grafana al madurar la operación.

## Decisiones excluidas

- Flutter/ArcGIS Flutter: descartado porque el SDK no admite Linux como host de desarrollo.
- Prisma: no es la opción base por el uso intensivo de PostGIS y el esquema SQL existente.
- Microservicios: no existe necesidad demostrada.
- Guardar archivos binarios en PostgreSQL: excluido.
