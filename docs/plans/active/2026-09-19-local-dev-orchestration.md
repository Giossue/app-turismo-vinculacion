# Arranque local unificado

## Objetivo

Permitir que el entorno local de Turismo Vinculación se inicie con un único comando,
conectando PostgreSQL/PostGIS, la API NestJS y el panel administrativo separado.

## Alcance

- Levantar el Compose local de PostgreSQL/PostGIS en el puerto `55433`.
- Aplicar el baseline y las migraciones SQL de forma repetible.
- Preparar los medios demo locales.
- Iniciar la API en `3000` y el panel admin en `3002`.
- Propagar las URLs correctas del API al navegador y al servidor de Next.js.
- Configurar `adb reverse` para un dispositivo Android físico conectado por USB.
- Detener los procesos locales con un comando explícito y acotado a los puertos y contenedor
  del proyecto.

## Decisiones

- El script vive en `scripts/dev-local.sh` y se expone como `corepack pnpm dev:local`.
- El panel administrativo sigue siendo un repositorio separado; el script solo coordina su
  proceso y no mezcla sus dependencias con el monorepo.
- El volumen de PostgreSQL se conserva entre ejecuciones.
- `scripts/stop-local.sh` detiene API, admin y el contenedor local sin tocar otros servicios.
- Las credenciales de administración no se generan automáticamente; se crean con el flujo
  explícito documentado por la API.

## Verificación

- `bash -n scripts/dev-local.sh`.
- Arranque real de PostgreSQL, API y admin desde un estado detenido.
- Health check de `GET /api/v1/health`.
- Revisión de `git diff --check`.
