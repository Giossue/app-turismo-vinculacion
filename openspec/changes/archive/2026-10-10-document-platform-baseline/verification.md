# Evidencia de adopción

Estos resultados corresponden a la primera adaptación. La retención física de la
planificación anterior se sustituyó después por la
[retirada documentada](../2026-10-10-remove-obsolete-planning/verification.md):
los originales se conservan en Git y la planificación usa exclusivamente OpenSpec.

Revisión del 10 de octubre de 2026. CognitiveStack dev se contrastó en el commit
0eaedfdca6feb08929711869982740e7b0de3fe1. El alcance incluye los dos repositorios;
el usuario precisó que utiliza únicamente Codex y Claude.

## Comprobaciones ejecutadas

- OpenSpec global y local 1.14.1; Node 24.16.0 y pnpm 12.5.1.
- Instalación con lockfiles congelados, sin scripts de terceros, en ambos proyectos.
- Comparación semántica con HEAD: versiones de las aplicaciones, importers,
  paquetes anteriores, overrides y parches conservados. OpenSpec añade 41 paquetes
  de tooling al lockfile pnpm; el manifiesto agrega una devDependency y tres scripts.
- Codex/Claude con doce workflows: 24 skills y doce comandos, 36 generados por repo.
  Regeneración con knowledge:update idéntica por SHA-256; sin integraciones ajenas.
- Retirados los archivos MiniMax y registros Hermes añadidos en el setup amplio.
- Diez skills propias del monorepo y siete del panel con frontmatter válido.
- Prettier aplicado a las fuentes propias afectadas; enlaces locales revisados
  sin referencias rotas; git diff --check sin errores.
- OpenSpec estricto acepta los ocho deltas de base y el contexto del proyecto.
- Los 94 planes anteriores conservan sus bytes; se actualizan únicamente routers
  históricos. No se modifican los archivos ajenos en docs/vinculacion.

## Contraste de comportamiento

Se consultaron módulos, guards, controllers y servicios existentes de auth,
centers, search, admin, ai, offline, files, favorites y opinions; también layout
de pestañas, sesión nativa, ubicación y almacenamiento offline del móvil.
Las specs describen esos contratos; no presentan colas, tenants o idempotencia
general como funcionalidades instaladas.

## Límites

No se ejecutaron suites del producto ni builds, emuladores, migraciones o SQL.
Esta evidencia comprueba knowledge y tooling y no certifica producción o
comportamiento completo en Android/iOS. No hay cambio de stack ni de runtime.
