# Bootstrap y primer corte vertical

## Objetivo

Convertir el repositorio documental en una base local ejecutable: monorepo, base de
datos PostgreSQL/PostGIS, API NestJS/Fastify y una web pública mínima que consulte
centros turísticos publicados. Dejar preparado el punto de entrada móvil sin simular
una integración ArcGIS que requiere el SDK y credenciales aún no disponibles.

## Alcance

- Workspace `pnpm` con aplicaciones API y web, más contratos y configuración compartida.
- Esquema `turismo_vinculacion_app` instalado reproduciblemente en PostgreSQL local.
- Fuente de esquema versionada para el bootstrap y seed local de un centro publicado.
- API `/api/v1`: salud, OpenAPI y consulta pública de centros por texto/viewport.
- Web pública: listado y ficha accesible consumiendo la API.
- Especificación y pruebas de la consulta pública.

## Fuera de alcance

- Login, captura de fichas, flujo real de aprobación, multimedia, IA, rutas, transporte,
  favoritos y navegación giro a giro.
- Solicitar o almacenar ubicación del dispositivo.
- Integración ArcGIS real: faltan SDK Flutter en la máquina y credenciales/licencia.

## Archivos y límites

- `apps/api`: monolito modular. El controlador solo adapta HTTP; la consulta vive en un
  caso de uso y el acceso PostGIS en un repositorio.
- `apps/web`: contenido público sin datos privados ni acceso directo a PostgreSQL.
- `database`: bootstrap, migración base y seed idempotente de desarrollo.
- `apps/mobile`: se añadirá solo el contrato/guía de bootstrap en este corte.

## Pasos

1. Crear workspace, configuración compartida y entornos de desarrollo seguros.
2. Instalar la base en PostgreSQL local y comprobar PostGIS, tablas, extensiones e índices.
3. Implementar API con configuración validada, health check, errores uniformes y OpenAPI.
4. Implementar lectura pública de centros `PUBLICADO`, búsqueda de texto y filtro de mapa.
5. Implementar web pública mínima y pruebas de las reglas de publicación/consulta.
6. Verificar formato, tipos, pruebas, build y consultas locales.

## Riesgos y decisiones pendientes

- El SDK Flutter no está instalado; validar la app móvil y ArcGIS requiere instalarlo y
  disponer de una cuenta/clave con licencia válida.
- `turismo_vinculacion_app.sql` es el snapshot inicial; se preservará y se declarará la
  ruta de migración sin duplicar manualmente 120 tablas.
- Los criterios exactos de rutas y ubicación en segundo plano siguen abiertos y no forman
  parte de esta entrega.

## Migraciones y datos

- No se destruye información: la base aún no existe en PostgreSQL local.
- El bootstrap crea PostGIS y `pg_trgm`; el seed de desarrollo se separa y es idempotente.
- Se validará desde una base vacía y se registrará el resultado real.

## Verificación prevista

- `psql` para extensiones, esquema y seed.
- `corepack pnpm format`, `lint`, `typecheck`, `test`, `build`.
- Peticiones HTTP a health y centros públicos contra PostgreSQL local.

## Resultado real

- Workspace pnpm con `apps/api` y `apps/web` creado; Flutter queda pendiente porque el
  SDK no está instalado en esta máquina.
- PostgreSQL del sistema no incluía PostGIS. Se preservó y se levantó la instancia local
  `turismo-vinculacion-postgres` con Podman en `127.0.0.1:55433`; contiene PostGIS 3.5.2,
  `pg_trgm`, 121 tablas y el seed de Guaranda.
- `podman-compose` no está instalado. El archivo Compose queda listo, y el mismo servicio
  se inició con Podman directo sin tocar contenedores preexistentes.
- API NestJS/Fastify con OpenAPI en `/api/docs`, health y consulta pública de centros por
  texto/viewport. La consulta de viewport usa `idx_centros_ubicacion`.
- Web Next.js con listado, ficha, vacío, 404, error/reintento, Tailwind y componentes
  HeroUI.
- `pnpm verify` pasa: formato, lint, tipos, una prueba unitaria y builds de API/web.
- Pruebas HTTP contra la base local devuelven el centro publicado y rechazan viewport
  parcial con `400`.

## Estado

Completado el 2026-09-16.
