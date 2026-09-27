# Despliegue

## Topología inicial

Servidor Ubuntu con Docker Compose:

- `proxy`: Caddy o Nginx, TLS y límites de entrada.
- `web`: Next.js.
- `api`: NestJS/Fastify.
- `worker`: BullMQ.
- `postgres`: PostgreSQL con PostGIS y pg_trgm.
- `redis`: caché/colas con persistencia apropiada para trabajos.
- `minio`: almacenamiento de objetos.
- `backup`: tareas programadas y verificación.

Producción debe separar volúmenes persistentes del ciclo de despliegue. El contenedor de
aplicación nunca posee el único ejemplar de datos.

## Dominios

- `turismo.example.ec`: web.
- `api.turismo.example.ec`: API.
- `media.turismo.example.ec`: objetos públicos/autorizados mediante CDN o proxy.

## Despliegue seguro

1. Construir imágenes inmutables.
2. Ejecutar pruebas y escaneo.
3. Crear respaldo compatible con el riesgo de migración.
4. Ejecutar migraciones con credencial específica.
5. Desplegar API/worker/web.
6. Verificar health, readiness y smoke tests.
7. Conservar rollback de aplicación; migraciones requieren estrategia propia.

## Configuración

Variables validadas al inicio. Proporcionar `.env.example`, nunca `.env` real. Separar
credenciales por entorno y rotar rutas/tiles privados, IA, correo, JWT y almacenamiento.

La API se construye desde el contexto raíz con `Dockerfile.api`, que usa la versión pnpm
`12.5.1` fijada por el workspace y `pnpm deploy` moderno para instalar únicamente la
distribución de producción de `@turismo/api` y escuchar en `0.0.0.0:3000`. No usar
`deploy --legacy`: el workspace contiene parches exclusivos del móvil y la implementación
antigua puede rechazarlos como no utilizados aunque la API no los dependa. En Dokploy, el
servicio debe usar ese Dockerfile y conservar el contexto raíz del monorepo.
La instalación inicial verifica el lockfile completo y llena el almacén de pnpm. La
fase `deploy` prefiere ese almacén y confía en el lockfile derivado para evitar
repetir la verificación de dependencias de producción contra el registro npm; si
falta algún paquete en caché, puede descargarlo. Instalación y `deploy` quedan
en una etapa independiente del código de la API: Docker conserva esas capas al
cambiar solo fuentes y vuelve a copiar únicamente `dist` a la imagen final.
El usuario `node` solo necesita escritura en `/app/.data/media`; evitar un `chown`
recursivo de `/app` porque vuelve a procesar todas las dependencias de producción
en una capa adicional durante cada construcción.

## Backups

- PostgreSQL: respaldos completos + política de retención; PITR cuando la operación lo requiera.
- MinIO: versionado/replicación o copia independiente.
- Redis: no se considera respaldo de datos de negocio.
- Probar restauración periódicamente; un backup no probado no cuenta.

## Disponibilidad

Health comprueba proceso; readiness comprueba dependencias críticas sin generar carga.
Alertar por errores, latencia, cola atrasada, disco, backup fallido y certificados.
