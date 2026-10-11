# Ciclo de cambios con CognitiveStack y OpenSpec

CognitiveStack aporta los criterios de producto, arquitectura, seguridad y calidad.
OpenSpec mantiene propuesta, diseño, escenarios, tareas y archivo de cada cambio.

## Fuente y alcance

Para comportamiento no trivial, crear `openspec/changes/<nombre>/`. Los deltas se
integran en `openspec/specs/` al sincronizar o archivar trabajo implementado.
Una corrección documental se resuelve directamente. Un cambio de tooling puede
usar `skip_specs: true` si no modifica comportamiento de producto.

Los documentos anteriores de `docs/product/features/` conservan contexto y
criterios. La planificación usa exclusivamente OpenSpec; los 94 documentos retirados
conservan su contenido en Git. Su
[inventario](../../openspec/changes/archive/2026-10-10-remove-obsolete-planning/retired-documents.json)
registra commit, rutas y hashes para recuperarlos. Al retomar un pendiente, contrastar
el código y proponer un cambio actual; una spec nueva no certifica su resolución.

## Fases

Explorar → proponer → revisar → aplicar → comprobar → sincronizar/archivar.
Actualizar artifacts si cambian decisiones. La solicitud del usuario determina
alcance y autorización: una implementación autorizada no necesita otra aprobación
por un workflow genérico. Una petición exclusiva de propuesta/exploración conserva
su alcance de planificación. Commit/push y producción requieren su solicitud.

No añadir o ejecutar tests sin que se soliciten. Registrar comprobaciones reales,
criterios pendientes y límites. La validación sintáctica no demuestra comportamiento.

## Herramientas

```bash
corepack pnpm openspec list --json
corepack pnpm openspec new change nombre-del-cambio
corepack pnpm openspec status --change nombre-del-cambio --json
corepack pnpm openspec instructions design --change nombre-del-cambio --json
corepack pnpm openspec validate --all --strict --no-interactive
corepack pnpm knowledge:update
```

El [perfil](../../openspec/tooling.json) fija los doce workflows: propose, explore,
new, continue, apply, update, ff, sync, archive, bulk-archive, verify y onboard.
Los opcionales ofrecen maneras de trabajar; instalarlos no obliga a ejecutar
onboarding, archivar pendientes ni repetir permisos.

Los workflows generados usan encabezados OpenSpec en inglés y texto de artifacts
en español. Cada Requirement incluye SHALL/MUST y al menos un Scenario WHEN/THEN.
Obtener los paths y artifacts desde el CLI antes de escribirlos. No editar skills,
comandos ni prompts generados; mantener contexto y reglas en `openspec/config.yaml`.

CLI global, integraciones e invocaciones: [instalación](openspec-installation.md).
