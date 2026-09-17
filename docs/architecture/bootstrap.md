# Bootstrap del repositorio

## Estructura objetivo

```text
apps/
  api/          NestJS
  web/          Next.js
  mobile/       React Native + Expo
  worker/       consumidores BullMQ
packages/
  contracts/    OpenAPI generado y tipos TypeScript
  config/       eslint, prettier y tsconfig compartidos
database/
  migrations/
  seeds/
infra/
  docker/
  proxy/
  monitoring/
docs/
```

## Orden recomendado

1. Inicializar workspace pnpm y configuración compartida.
2. Crear NestJS con Fastify, health checks, config validada y OpenAPI.
3. Convertir `turismo_vinculacion_app.sql` en migraciones versionadas sin perder PostGIS.
4. Crear Next.js con HeroUI React y shell público/administrativo.
5. Crear Expo/React Native y verificar MapLibre en Android; configurar EAS para builds iOS.
6. Generar clientes desde OpenAPI.
7. Añadir PostgreSQL/PostGIS, Redis y MinIO a Docker Compose.
8. Implementar identidad, roles y primer administrador.
9. Construir un corte vertical: centro publicado → API → mapa → ficha.
10. Añadir CI con formato, lint, tipos, pruebas, build y validación de migraciones.

## Criterio del primer corte

No iniciar IA, video, notificaciones ni navegación completa antes de demostrar:

- autenticación y permisos;
- migraciones reproducibles;
- centro publicado consultable;
- búsqueda espacial;
- marcador MapLibre y ficha pública;
- revisión básica desde web.

## Entornos

- `local`: Docker Compose y proveedores simulados cuando sea posible.
- `staging`: datos no sensibles, mismas imágenes y topología que producción.
- `production`: credenciales separadas, backups, alertas y migración explícita.
