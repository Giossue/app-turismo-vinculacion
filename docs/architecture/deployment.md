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
`12.5.1` fijada por el workspace. Una etapa instala solo las dependencias de producción
de `@turismo/api`; otra instala las dependencias de compilación y genera `dist`. La imagen
final hereda directamente la primera etapa y copia únicamente `dist` de la segunda.
Esto evita que `pnpm deploy` vuelva a copiar cientos de paquetes desde una capa previa,
operación que resultó lenta en Dokploy incluso con las descargas y la verificación del
lockfile ya terminadas. En Dokploy, el servicio debe usar ese Dockerfile y conservar el
contexto raíz del monorepo. La API escucha en `0.0.0.0:3000`.
El usuario `node` solo necesita escritura en `/app/.data/media`; evitar un `chown`
recursivo de `/app` porque vuelve a procesar todas las dependencias de producción
en una capa adicional durante cada construcción.

## Cambiar el flujo editorial de centros

Para `20261003_center_three_state_workflow.sql`, preparar API y panel del flujo de tres
estados antes de tocar la base remota. Durante la actualización, pausar las mutaciones
de fichas y respaldar `estados_resenia`, `centros_turisticos`,
`borradores_centros_turisticos`, `revisiones_publicacion` y la definición de
`fn_preparar_centro_turistico`. Verificar el destino por `current_database()`,
`current_user` e `inet_server_addr()`; las credenciales no se copian ni se versionan.

Con la API compatible desplegada, ejecutar únicamente esa migración, desplegar el panel
y reanudar operaciones después de comprobar los tres estados activos, el filtro de
activación y las decisiones de revisión. No ejecutar el runner local, seeds ni otras
migraciones históricas sobre producción. El endpoint público sigue exigiendo
`activo=true` y `PUBLICADO`; la migración no publica centros.

Verificación local previa: `bash scripts/verify-center-workflow.sh` crea y elimina su
propio cluster PostgreSQL/PostGIS con socket privado. Prueba esquema vacío y previo,
idempotencia, códigos, historial, publicación/devolución atómicas, fallo de multimedia,
activación y decisiones concurrentes sin usar credenciales de despliegue.

La reversión exige el respaldo y una nueva pausa de mutaciones: restituir trigger y
estados anteriores sólo para registros no modificados desde la conversión. No revertir
automáticamente las publicaciones nuevas ni borrar su auditoría.

## Activar mapas sin conexión

La actualización de código no publica ciudades automáticamente. Para activar una ciudad:

1. Desplegar la API con `OFFLINE_MAP_STYLE_URL` apuntando al estilo público del TileServer
   propio, por ejemplo `https://maps.devs-ueb.tech/styles/basic-preview/style.json`. Los
   tiles, glifos y sprites deben ser accesibles desde el teléfono; no usar un hostname
   privado que solo resuelva dentro de Docker. La URL se valida como HTTP/S sin credenciales.
2. Comprobar `GET /api/v1/offline/map-style`: devuelve el JSON GL v8 directamente, URLs
   absolutas y `Noto Sans Regular`. La API limita tamaño, tiempo y redirecciones del proveedor.
3. Revisar los límites oficiales o las coordenadas de la localidad y el contenido público.
   Una ciudad se ofrece para descargar automáticamente en cuanto tiene un centro turístico,
   punto de interés o establecimiento publicado; no hace falta publicar un paquete. Su versión
   es el último cambio (`updated_at`) de ese contenido, de sus zonas turísticas y de las
   rutas de transporte y sus versiones, incluidas despublicaciones y bajas lógicas, por lo
   que la app ofrece la actualización sola. Requiere `20261004_offline_change_tracking.sql`.
   No borrar filas a mano: un borrado físico no cambia la versión; usar la baja lógica. Una fila de
   `paquetes_offline_ciudad` publicada solo es necesaria para fijar otros niveles de zoom
   (por defecto 8–17). No se debe usar un seeder de demostración para llenar una ciudad.
4. Verificar `/offline/cities` y el manifiesto de esa ciudad; confirmar cobertura, recuentos
   y ausencia de datos privados. No considerar una descarga vacía como contenido completo.
5. Actualizar el móvil, descargar con internet, cerrar/reabrir en modo avión y probar mapa,
   zoom, temas, fichas, búsqueda, actualización y borrado. Guardar una ruta calculada y
   comprobar que seguirla no recalcula por red ni activa seguimiento antes de pulsar iniciar.

La publicación de paquetes y contenido y la actualización de la app son operaciones
separadas de las pruebas de código. La prueba en modo avión sigue siendo necesaria para
validar el renderer y la base nativa MapLibre en Android/iOS.

## Backups

- PostgreSQL: respaldos completos + política de retención; PITR cuando la operación lo requiera.
- MinIO: versionado/replicación o copia independiente.
- Redis: no se considera respaldo de datos de negocio.
- Probar restauración periódicamente; un backup no probado no cuenta.

## Disponibilidad

Health comprueba proceso; readiness comprueba dependencias críticas sin generar carga.
Alertar por errores, latencia, cola atrasada, disco, backup fallido y certificados.
