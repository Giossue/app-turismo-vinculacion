# Guía de agentes del proyecto

## Proyecto

`Turismo Vinculación App` es una plataforma turística para Ecuador. Empieza con
Guaranda, pero el dominio, la DPA y la arquitectura deben funcionar a escala nacional.

Stack aprobado:

- React Native, Expo y TypeScript para Android/iOS.
- MapLibre React Native para visualización nativa de mapas.
- Next.js, TypeScript, HeroUI React y Tailwind CSS para web pública y administración.
- NestJS con adaptador Fastify para la API REST.
- PostgreSQL, PostGIS y, cuando sea necesario, pgvector.
- Redis y BullMQ para caché, límites y trabajos persistentes.
- MinIO/S3 para fotografías, videos, audios y documentos.
- Docker Compose como base de operación en servidor propio.

## Leer antes de trabajar

- Producto: `docs/product/overview.md`
- Módulos: `docs/product/modules.md`
- Decisiones abiertas: `docs/product/open-decisions.md`
- Dominio: `docs/product/domain-model.md`
- Arquitectura: `ARCHITECTURE.md`
- Stack: `docs/architecture/stack.md`
- Aplicación móvil: `docs/architecture/mobile.md`
- Backend: `docs/architecture/backend.md`
- Web: `docs/architecture/web.md`
- Base de datos: `docs/architecture/database.md`
- Mapas y navegación: `docs/architecture/maps-navigation.md`
- IA: `docs/architecture/ai.md`
- Definition of Done: `docs/quality/definition-of-done.md`
- Seguridad: `docs/security/principles.md`
- Privacidad y ubicación: `docs/security/privacy-location.md`

## Flujo obligatorio

1. Leer este archivo y el `AGENTS.md` más cercano al código afectado.
2. Abrir solo la documentación relacionada con la tarea.
3. Para trabajo no trivial, crear o actualizar un plan en `docs/plans/active/`.
4. Implementar la unidad coherente más pequeña.
5. Mantener sincronizados comportamiento, API, datos y documentación.
6. Ejecutar verificaciones proporcionales al cambio.
7. No declarar terminado mientras pruebas o documentación estén desalineadas.

## Comandos de referencia

Mientras no exista código, estos comandos son objetivos de bootstrap. Una vez creado el
monorepo, deben corresponder a scripts reales.

```bash
corepack pnpm install
corepack pnpm format
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm verify

corepack pnpm --filter @turismo/mobile lint
corepack pnpm --filter @turismo/mobile typecheck
corepack pnpm --filter @turismo/mobile test
```

## Restricciones permanentes

- Usar pnpm mediante Corepack en los proyectos JavaScript/TypeScript.
- Usar pnpm mediante Corepack también para Expo/React Native; no mezclar gestores.
- PostgreSQL/PostGIS es la fuente de verdad. Redis nunca almacena el único ejemplar de un dato.
- Toda modificación de esquema usa una migración versionada.
- Mantener secretos y claves de IA, correo, rutas, tiles privados y almacenamiento en el servidor.
- La aplicación móvil nunca se conecta directamente a PostgreSQL, Redis o MinIO.
- La IA consulta datos mediante herramientas controladas de la API y solo usa contenido aprobado/publicado.
- No enviar a la IA contraseñas, tokens, ubicación histórica ni datos personales innecesarios.
- Autorización por rol, acción y registro en el backend; ocultar un botón no constituye seguridad.
- Solicitar ubicación cuando la función la necesita, no durante el registro.
- Ubicación en segundo plano solo durante navegación activa, con consentimiento específico.
- Usar eliminación lógica para centros y usuarios; preservar auditoría e identificadores históricos.
- Archivos en MinIO/S3; en PostgreSQL solo metadatos y claves de objeto.
- No exponer IDs internos, buckets, rutas físicas, proveedores o detalles técnicos en la UI.
- No introducir microservicios: comenzar como monolito modular más trabajadores de cola.
- No añadir dependencias sin documentar propósito, mantenimiento, licencia y superficie de riesgo.
- No editar archivos generados manualmente.
- No hacer commit o push salvo solicitud explícita.

## Definition of Done resumida

Una tarea termina cuando implementación, migraciones, pruebas, seguridad, accesibilidad,
observabilidad y documentación cuentan la misma historia.
