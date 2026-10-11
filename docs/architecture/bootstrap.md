# Preparar el repositorio existente

## Estructura actual

```text
apps/
  api/          NestJS/Fastify y módulos registrados
  mobile/       Expo/React Native para turistas
  web/          scaffold Next previo, conservado
database/
  migrations/   SQL incremental de PostgreSQL/PostGIS
  seeds/        fuentes locales; no ejecutar en producción por bootstrap
docs/           producto, arquitectura, seguridad y calidad
openspec/       contexto, perfil, specs y cambios
.agents/skills/ especialistas locales y workflows generados
scripts/        operación local y wrapper OpenSpec
```

El panel institucional vive en el repositorio separado `web-turismo-admin`.
No hay `apps/worker`, paquetes de contratos compartidos, outbox ni cola BullMQ
registrados como implementación de este workspace.

## Instalación local

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm knowledge:init
corepack pnpm openspec list --json
corepack pnpm dev:api
corepack pnpm --filter @turismo/mobile start
```

Node y pnpm se fijan en `package.json`. Los lockfiles y `pnpm-workspace.yaml`
conservan overrides, parches y la política de builds nativos. No cambiar el gestor
ni regenerar parches por instalar knowledge.

Leer la configuración de [desarrollo y despliegue](deployment.md) antes de iniciar
proveedores. Crear variables desde ejemplos locales sin copiar credenciales de
producción. Tener Docker Compose no confirma que la aplicación use todos sus servicios.

## Knowledge y OpenSpec

El [router documental](../README.md) indica qué leer por tarea. El
[perfil completo](../quality/openspec-installation.md) instala Codex y Claude
con los doce workflows con CLI local exacto y wrapper. `knowledge:update` los regenera.

Las specs base describen código existente. La planificación usa OpenSpec; los
antecedentes retirados se conservan en Git y no certifican resolución de pendientes.
No ejecutar onboarding, suites, migraciones o commits como efecto de instalar un
workflow. La solicitud del usuario define las acciones.

## Móvil nativo

Consultar [AGENTS móvil](../../apps/mobile/AGENTS.md), [arquitectura móvil](mobile.md)
y [parches nativos](native-patches.md). MapLibre requiere un development build;
Expo Go no sustituye el runtime nativo de este producto. Conservar la configuración
Expo, las decisiones de navegación y el flujo de prebuild del proyecto.

## Entornos y persistencia

Local, staging y producción conservan configuración, datos y credenciales propias.
Comprobar el destino real antes de afirmar que se opera sobre producción. Las
migraciones siguen el procedimiento de [datos](database.md): verificar respaldo,
propietario y permisos; no recrear ni limpiar una base productiva.

La adopción documental y de tooling no requiere acceder a bases ni ejecutar SQL.
