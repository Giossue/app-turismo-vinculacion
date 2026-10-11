# OpenSpec: instalación para Codex y Claude

Se siguió la [guía oficial](https://openspec.dev/docs/installation) y su
[contenido para agentes](https://openspec.dev/llms.mdx/docs/installation/content.md)
en las raíces de ambos repositorios. CognitiveStack organiza el knowledge;
OpenSpec registra propuestas, escenarios, tareas e historia sin reemplazar el stack.

## CLI global y local

Se comprobó Node 24.16.0, superior al requisito OpenSpec 20.19.0, y se instaló:

```bash
npm install -g @fission-ai/openspec@1.14.1 --ignore-scripts --no-audit --no-fund
openspec --version
```

La versión 1.14.1 se fija también como devDependency exacta en ambos proyectos,
con sus propios lockfiles. Se conservan Bun en el panel y pnpm/Corepack en el
monorepo. No se modifica el inicio del shell.

El wrapper [scripts/openspec.mjs](../../scripts/openspec.mjs) comprueba la versión,
aplica el [perfil local](../../openspec/tooling.json) temporal y desactiva telemetría
y checks de actualización. No modifica preferencias personales. Actualizar el CLI
requiere alinear dependencia, lockfile y manifiesto.

## Solo Codex y Claude; todos los workflows

El perfil selecciona `codex,claude`, delivery `both` y los doce workflows.
«Todos» se aplica a los workflows; el usuario confirmó que solo usa esos dos agentes.
Las demás integraciones y los archivos globales MiniMax/Hermes añadidos en el setup
inicial se retiraron.

| Workflow     | Codex                           | Claude Code          |
| ------------ | ------------------------------- | -------------------- |
| propose      | `$openspec-propose`             | `/opsx:propose`      |
| explore      | `$openspec-explore`             | `/opsx:explore`      |
| new          | `$openspec-new-change`          | `/opsx:new`          |
| continue     | `$openspec-continue-change`     | `/opsx:continue`     |
| apply        | `$openspec-apply-change`        | `/opsx:apply`        |
| update       | `$openspec-update-change`       | `/opsx:update`       |
| ff           | `$openspec-ff-change`           | `/opsx:ff`           |
| sync         | `$openspec-sync-specs`          | `/opsx:sync`         |
| archive      | `$openspec-archive-change`      | `/opsx:archive`      |
| bulk-archive | `$openspec-bulk-archive-change` | `/opsx:bulk-archive` |
| verify       | `$openspec-verify-change`       | `/opsx:verify`       |
| onboard      | `$openspec-onboard`             | `/opsx:onboard`      |

## Ubicación y descubrimiento

El contenido durable vive en `docs/` y `openspec/`. AGENTS y CLAUDE en la raíz
sirven de entrada a las mismas fuentes, sin duplicar todo el knowledge.
El CLI utiliza las rutas oficiales que descubren los clientes:

- `.agents/skills/openspec-*/SKILL.md`: doce skills de Codex.
- `.claude/skills/openspec-*/SKILL.md`: doce skills de Claude.
- `.claude/commands/opsx/*.md`: doce comandos de Claude.

Son 36 archivos generados por repositorio. Codex usa skills, sin otra carpeta
propia de comandos. Las skills especialistas originales conservan su fuente
canónica en `.agents/skills/` y se consultan desde el routing del knowledge.
Las rutas de otros agentes no son necesarias. Los generados se excluyen de
Docker y Prettier y se mantienen mediante el CLI.

Rutas e invocaciones: [Supported tools](https://openspec.dev/docs/supported-tools).

## Uso y mantenimiento

```bash
corepack pnpm knowledge:init
corepack pnpm knowledge:update
corepack pnpm openspec validate --all --strict --no-interactive
```

`knowledge:init` selecciona explícitamente Codex y Claude; no usar `--tools all`
para regenerar este proyecto. Reiniciar el IDE/cliente para redescubrir workflows.
Las reglas propias viven en AGENTS, docs y `openspec/config.yaml`; no editar
skills y comandos generados a mano.

Instalar workflows no los ejecuta ni amplía autorización para pruebas, commits,
despliegues o cambios de producción. La evidencia de setup comprueba tooling y
documentación; no certifica dispositivos, API remota o producción.
