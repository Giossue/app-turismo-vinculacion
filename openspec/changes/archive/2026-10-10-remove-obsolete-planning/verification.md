# Evidencia de retirada de la planificación anterior

Fecha: 10 de octubre de 2026. Cambio documental solicitado por el usuario.

## Fuente y recuperación

- `git fetch --depth 1 origin dev` confirmó el commit remoto de CognitiveStack
  `0eaedfdca6feb08929711869982740e7b0de3fe1`.
- El árbol de esa rama contiene `openspec/changes/` y `openspec/specs/`, sin
  `docs/plans/`. El árbol local del monorepo también queda sin esa carpeta.
- Los 94 documentos retirados coincidían byte por byte con sus originales
  versionados en `91736d206fe194838f07fb72b45c95411f6e75d2`.
- El [inventario](retired-documents.json) conserva las rutas originales, SHA-256,
  títulos y estados declarados. Recuperación: `git show <sourceCommit>:<path>`.
  Esos estados históricos no certifican implementación ni despliegue.

## Comprobaciones

- Routing, índices, skill de documentación y contexto del CLI usan OpenSpec para
  planificar. Las consultas de antecedentes remiten a Git con commit fijo.
- Los hashes de las ocho specs, 36 archivos generados para Codex y Claude,
  wrapper, manifiesto, tooling y lockfile coinciden con los anteriores a esta retirada.
- Inventario de integración: dos herramientas, doce workflows, 24 skills y doce
  comandos locales. No hay integraciones OpenSpec adicionales.
- Las diez skills authored superan la comprobación de frontmatter.
- OpenSpec estricto acepta las ocho specs y este cambio sin deltas, conforme a
  `skip_specs: true`. `git diff --check` pasa.
- El análisis semántico de manifiestos y lockfiles conserva dependencias del
  producto, importers y parches nativos. `docs/vinculacion/` queda fuera del alcance.
- Formato correcto mediante Prettier sobre los 88 archivos propios afectados.
  Los 126 enlaces locales revisados resuelven en el árbol final, incluido este archivo.
- El CLI archivó el cambio como `2026-10-10-remove-obsolete-planning`, con
  `specsUpdated: false`. La validación estricta posterior acepta las ocho specs.

## Límites

No se ejecutaron suites de producto, builds, migraciones ni operaciones de producción.
Esta retirada conserva el stack y los contratos; no cierra pendientes funcionales
de los documentos anteriores. Estas comprobaciones preceden al commit y push de la entrega.
