# ADR 0005: CognitiveStack y OpenSpec con el stack actual

## Estado

Aceptado el 10 de octubre de 2026 por solicitud del usuario para ambos repositorios.

## Contexto

El knowledge anterior contiene producto, arquitectura, feature docs y planes,
con algunas afirmaciones de bootstrap superadas. CognitiveStack dev organiza el
conocimiento y criterios, pero su stack de referencia no coincide con Turismo.
El usuario solicita conservar las tecnologías salvo necesidad de seguridad demostrada.

## Decisión

- Adaptar el commit `0eaedfd` de dev con textos originales y atribución.
- Conservar Expo/React Native/Paper/MapLibre, NestJS/Fastify/TypeORM/PostGIS,
  SQL versionado, pnpm/Corepack y parches nativos en el monorepo.
- Conservar Next/React/TypeScript/MUI/Bun en el panel separado.
- Usar OpenSpec 1.14.1 global y como devDependency exacta en ambos repositorios.
- Instalar las integraciones de Codex y Claude y los doce workflows mediante el CLI, con perfil
  fijado y regeneración local. No editar generados manualmente.
- Usar exclusivamente OpenSpec para la planificación y las specs de base. Conservar
  los documentos retirados en Git y reconciliar sus estados históricos al retomarlos.
- Mantener autorización del usuario y ejecutar pruebas cuando se soliciten.

## Consecuencias

Cada repositorio conserva sus propias fuentes y contratos. Un cambio transversal
coordina consumidor/API; no mezcla componentes, gestores o credenciales.
Las skills de Codex viven en .agents/skills y las de Claude en .claude/skills;
sus comandos están en .claude/commands/opsx. Los generados se excluyen de Docker
y formato y se mantienen con el CLI. Las otras integraciones se retiraron
tras precisar que solo se utilizan esos dos clientes.

No se añade Better Auth, Prisma, Express, Tailwind, tenant, cola o nuevo renderer.
No se ejecutan migraciones, semillas o mutaciones remotas durante la adopción.
Las limitaciones de implementación se registran sin presentarlas como features.

## Evidencia

[Análisis de dev](../cognitivestack-adoption.md),
[perfil reproducible](../../../openspec/tooling.json),
[ciclo de cambios](../../quality/change-lifecycle.md) y
[instalación oficial adaptada](../../quality/openspec-installation.md).
