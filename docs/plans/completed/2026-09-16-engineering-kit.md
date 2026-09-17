# Engineering kit adaptado

- Estado: completado
- Fecha: 2026-09-16

## Objetivo

Adaptar el contexto ExpressJS suministrado al producto turístico y al stack aprobado.

## Resultado

- Contexto de producto y dominio.
- Arquitectura Flutter/ArcGIS, Next.js, NestJS y PostgreSQL/PostGIS.
- ADRs de decisiones principales.
- Reglas de seguridad, ubicación, calidad y pruebas.
- Instrucciones para Codex, Claude y Copilot.
- Skills locales para procedimientos repetibles.

## Decisiones materiales

- Flutter sustituye React Native por la integración oficial de ArcGIS.
- NestJS/Fastify sustituye Express directo.
- TypeORM + SQL PostGIS sustituye Prisma.
- Autenticación propia del backend sustituye Better Auth para servir móvil y web.
- HeroUI React se usa solo en web.
