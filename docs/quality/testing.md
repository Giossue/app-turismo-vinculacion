# Estrategia de pruebas

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
