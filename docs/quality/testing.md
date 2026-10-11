# Estrategia de pruebas

## Ejecución y evidencia

Añadir o ejecutar pruebas cuando el usuario lo solicite. Esta estrategia describe
cobertura deseada, no comandos que deban lanzarse ante cualquier edición.
Para instalar knowledge, comprobar CLI, configuración, formato, enlaces y origen
de generados; no arrancar API, dispositivos o bases por ese motivo.

Scripts reales: `corepack pnpm test`, `typecheck`, `lint`, `build` y `verify`,
y filtros `@turismo/api` / `@turismo/mobile`. Las suites de migraciones siguientes
son runners aislados que se ejecutan solo dentro del alcance solicitado.

## Pirámide

- Unitarias: dominio, validadores, políticas y transformaciones.
- Casos de uso: permisos, transiciones y efectos esperados.
- Integración: PostgreSQL/PostGIS, TypeORM, Redis, MinIO, HTTP y migraciones.
- Contrato: OpenAPI y adaptadores de proveedores.
- E2E: flujos críticos web/móvil con proveedores simulados.

## Flujos críticos

- Registro/login/rotación/revocación.
- Administrador crea borrador, revisa, corrige, aprueba y publica.
- Turista ve solo contenido publicado.
- Consulta por viewport y cercanía.
- Ubicación denegada con origen manual.
- Favorito y opinión con permisos/moderación.
- Importación idempotente con errores parciales.
- IA usa fuentes correctas y no inventa campos faltantes.
- Restauración de backup y ejecución completa de migraciones.

## Proveedores

CI no depende de mapas/rutas, IA, correo, clima, FCM/APNs ni Internet. Usar puertos, fixtures y
servidores falsos; mantener pruebas de smoke separadas para staging.

## Datos

Fixtures deterministas que incluyan coordenadas ecuatorianas válidas, zonas sin datos,
acentos, textos largos, usuarios sin permisos, estados editoriales distintos y localidades
con/sin resultados de una misma actividad para verificar el fallback territorial.

## Eliminación administrativa

`bash scripts/verify-admin-deletion.sh` crea un clúster PostgreSQL/PostGIS temporal con
socket Unix privado, aplica las migraciones, ejecuta los servicios reales y repite la
migración de eliminación con datos e historial conservados. El clúster se retira al
terminar. No usa `.env` ni credenciales del despliegue.

La suite `apps/api/test/admin-deletion.integration.spec.ts` comprueba los cuatro dominios,
los cinco catálogos administrables, auditoría, versiones y calificaciones, reintentos,
referencias conservadas, rechazo de mutaciones posteriores y rollback ante errores.
Se omite en la ejecución unitaria normal; solo acepta el socket temporal del runner.

El reinicio del entorno local y su historial de migraciones se verifican por separado
con `scripts/test-local-migrations.sh`; requisitos y alcance en
[README-local-migrations.md](../../scripts/README-local-migrations.md).

## Responsividad móvil

El harness Expo separado de `apps/mobile/qa` y el runner ADB prueban componentes
nativos con varios tamaños Android, fuente ampliada y teclado. Ver cobertura,
comandos y límites en [mobile-responsive-checks.md](mobile-responsive-checks.md).
Conservar capturas y revisar los textos además de las comprobaciones de geometría.

## Caché y sesión móvil

Las regresiones de `src/core/api/query-runtime.test.ts`, `query-cache-persister.test.ts`
y `query-persistence.test.ts` usan QueryClient/observers reales con fuentes nativas y
almacenamiento simulados. Cubren revalidación selectiva, orden de eventos, borrado frente
a escrituras/lecturas pendientes, edad individual y limpieza por propietario.
`mobile-session.test.ts`, `token-storage.native.test.ts` y
`saved-collection-options.test.ts` comprueban cierre inmediato, renovación compartida,
cancelación, orden de SecureStore, cambio de cuenta y callbacks privados tardíos.
`optimistic-query-persistence.test.ts` comprueba que una colección tentativa no reemplaza
la copia confirmada, incluidas operaciones concurrentes y escrituras diferidas.
`offline-center-queries.test.ts` comprueba el arranque desde descargas sin red, cancelación,
respuestas 403/404 y reintentos del mapa solo con foco y conexión. Los fallos de guardados
y opiniones sin red se prueban sin dejar mutaciones pausadas.

El script `corepack pnpm --filter @turismo/mobile test` incluye estas regresiones;
`typecheck`, `lint`, `format` y `build` del mismo filtro verifican el paquete. `build`
exporta web y no certifica el puente Android/iOS. Para cambios de módulos nativos,
reconstruir el dev build mediante `dev:android` o `expo run:ios` en el entorno adecuado.
La comprobación de dispositivo debe cubrir fondo/primer plano, modo avión/reconexión,
favoritos sin conexión y cierre con respuestas retardadas usando una API de pruebas.
Una compilación o exportación correcta no sustituye esa comprobación ni valida iOS.
La evidencia del cambio vive en OpenSpec, separada de estas instrucciones.

## Rendimiento móvil

La evidencia de [mejorar-rendimiento-movil](../../openspec/changes/mejorar-rendimiento-movil/evidence.md)
registra volumen, entorno, calentamiento, mediana/p95 y preparación inicial por separado.
Los benchmarks de búsqueda, proyección SQLite e imágenes son locales y sintéticos; no
sustituyen las suites ni las comprobaciones de dispositivo. La exportación Android verifica
resolución nativa y bundle Hermes, sin instalar ni medir la APK en el teléfono.

Cuando se soliciten pruebas, incluir equivalencia de búsqueda (sinónimos, aproximaciones,
rutas y límites), cancelación/plazos de cuerpo HTTP, invalidación de descargas y variantes
públicas después de retirar publicación, además de scroll/teclado y páginas de opiniones.
