# CognitiveStack dev: análisis y adaptación al monorepo

## Fuente

- Repositorio solicitado: [CognitiveStack dev](https://github.com/Elvis-WDev/CognitiveStack/tree/dev).
- Commit analizado: [`0eaedfdca6feb08929711869982740e7b0de3fe1`](https://github.com/Elvis-WDev/CognitiveStack/tree/0eaedfdca6feb08929711869982740e7b0de3fe1).
- Fecha del commit: 1 de octubre de 2026; adopción: 10 de octubre de 2026.
- Alcance confirmado: este monorepo y `web-turismo-admin`.

Se revisaron los 94 archivos de dev, incluidos 38 documentos, siete skills
especialistas, siete workflows canónicos y entrypoints/config. Es knowledge y
metodología; no una biblioteca que deba incorporarse al runtime. Las mismas
fuentes se analizaron para el panel y se adaptan aquí a API y móvil.

## Aportaciones

Separar producto, specs, arquitectura, seguridad y calidad; briefs de pantalla y
operación sensible; niveles P0–P3; acciones proporcionales al riesgo; selección
de componentes; repetición/concurrencia; fuente única y historia de cambios.
OpenSpec aporta artifacts y workflows reproducibles. Se instala su versión
oficial actual 1.14.1 con los doce workflows para Codex y Claude.

## Correspondencia y decisiones

| Dev de referencia                      | Adaptación a Turismo                                                       |
| -------------------------------------- | -------------------------------------------------------------------------- |
| Express                                | NestJS/Fastify vigente, monolito modular                                   |
| Prisma                                 | TypeORM, SQL parametrizado/PostGIS y migraciones SQL incrementales         |
| Better Auth                            | Guards Nest propios, JWT `jose`, Argon2id y sesiones existentes            |
| React web / shadcn / Tailwind          | Expo/React Native/Paper/Tourism/MapLibre; panel MUI en otro repo           |
| TanStack Table                         | Colecciones nativas; DataGrid solo en el panel                             |
| Axios                                  | Clientes HTTP actuales de cada consumidor                                  |
| Tenants y memberships universales      | Roles, propiedad y registro actuales; tenant pendiente de contrato         |
| Clave idempotente y outbox universales | Versiones/transacciones actuales y diseño explícito por operación          |
| Jobs persistentes                      | Redis/BullMQ previstos; no worker instalado; parser Excel vive en el panel |
| Documentos de UI operacional           | Briefs nativos, sheets, mapa, permisos y coordinación con MUI              |
| Permisos genéricos de onboarding       | Alcance y autorización del usuario prevalecen                              |
| Suites exigidas para cualquier edición | Ejecutar tests cuando se soliciten y reportar evidencia proporcional       |
| Profile global                         | Manifiesto local, wrapper y regeneración con doce workflows                |

El stack se conserva según [ADR 0005](adr/0005-cognitivestack-openspec.md).
No se identificó una necesidad de cambiar tecnologías para adoptar el knowledge.
Los documentos de native patches, IA, rutas, privacidad, SQL y features previas
se mantienen; las áreas de CognitiveStack se redactan con datos del producto.

## Contradicciones corregidas

El README y Copilot aún mencionaban HeroUI. La web administrativa ya es externa
y MUI; el scaffold público anterior se conserva. El mapa de arquitectura nombraba
worker y packages que no existen. Backend declaraba BullMQ, outbox y una clave
idempotente general sin implementación encontrada. Stack decía Passport/Zustand,
ausentes de los manifiestos actuales. Datos hablaba de migraciones futuras aunque
ya existen SQL incrementales. Se corrigen esas afirmaciones sin refactorizar código.

Las versiones Expo/Router de docs se alinean con `apps/mobile/package.json` y
el AGENTS móvil. Las decisiones y restricciones nativas se conservan. La rama `dev`
no incluye `docs/plans/`; se retira esa carpeta de la adaptación. Sus 94 documentos
originales se conservan en Git, con commit, rutas y hashes en el
[inventario de retirada](../../openspec/changes/archive/2026-10-10-remove-obsolete-planning/retired-documents.json).
La planificación queda exclusivamente en OpenSpec; no se certifican pendientes
históricos como completados.

## Procedencia, licencia y mantenimiento

Dev no incluye una licencia general de sus textos. Se redacta adaptación propia
en español con atribución; no se atribuye MIT a todo CognitiveStack. Los workflows
generados conservan MIT y metadata de OpenSpec.

Para revisar un dev posterior, fijar commit, comparar por área y actualizar las
fuentes afectadas conservando ADRs, stack y contexto turístico. No sobrescribir
docs locales con la plantilla ni ejecutar scripts de bootstrap por encontrarlos allí.
Usar [instalación y perfil](../quality/openspec-installation.md) para regenerar.

La evidencia de instalación es documental y del CLI: enlaces, formato, skills,
configuración, lockfiles y regeneración. No demuestra todo el comportamiento de
la API, Android/iOS, mapas nativos o producción. No se accede a secretos ni bases
para instalar esta metodología.

El resultado está en la [evidencia de adopción](../../openspec/changes/archive/2026-10-10-document-platform-baseline/verification.md).
La corrección de la estructura está en la
[evidencia de retirada](../../openspec/changes/archive/2026-10-10-remove-obsolete-planning/verification.md).
