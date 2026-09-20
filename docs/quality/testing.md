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
