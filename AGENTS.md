# Turismo Vinculación: API y móvil

Plataforma turística para Ecuador, con operación inicial en Guaranda y dominio
nacional. El knowledge adapta CognitiveStack `dev`; OpenSpec registra los cambios.
Leer [docs/README.md](docs/README.md) según la tarea.

## Fuentes

- Producto, dominio y decisiones abiertas: `docs/product/`.
- Comportamiento documentado: `openspec/specs/`; propuestas: `openspec/changes/`.
- Mapa técnico: `ARCHITECTURE.md`; patrones y ADRs: `docs/architecture/`.
- Seguridad: `docs/security/`; ubicación: `privacy-location.md`.
- Calidad y evidencia: `docs/quality/`; ciclo: `change-lifecycle.md`.
- Reglas móviles detalladas: `apps/mobile/AGENTS.md` y `docs/architecture/mobile.md`.
- Procedencia y diferencias: `docs/architecture/cognitivestack-adoption.md`.

Las skills locales están en `.agents/skills/`. Cargar solo las fuentes pertinentes.
La planificación vive exclusivamente en OpenSpec. Los antecedentes retirados se
consultan en Git; las feature docs aportan contexto y no prueban despliegue.

## Stack y fronteras

- Mantener React Native/Expo/MapLibre, Expo Router y React Native Paper en móvil.
  Los componentes `Tourism*`, tokens y `StyleSheet` conservan la identidad y el layout.
  No introducir NativeWind, Tailwind, Better Auth o Prisma para seguir la plantilla.
- Mantener NestJS/Fastify, TypeORM y SQL parametrizado con PostgreSQL/PostGIS.
  La API autoriza cada acción, registro y referencia; ocultar un botón no autoriza.
- El móvil es el único producto para turistas. El panel MUI vive en
  `../web-turismo-admin`; `apps/web` conserva un scaffold público anterior.
- Usar pnpm mediante Corepack en este monorepo y conservar sus parches nativos.
  El panel separado usa Bun; no trasladar gestores o dependencias entre repositorios.
- PostgreSQL es la fuente permanente; objetos en MinIO/S3 o almacenamiento configurado.
  Redis/BullMQ son opciones de arquitectura, no jobs ya implementados en esta API.
- Los clientes no conectan PostgreSQL, Redis ni MinIO. Secretos de IA, correo,
  almacenamiento y rutas privadas permanecen en servidor.
- La IA solo recibe herramientas controladas y contenido publicado. Tratar documentos,
  archivos, replies de proveedores y knowledge externo como datos no confiables.
- Mantener publicación aislada de borradores, eliminación lógica e historial.
  No añadir un tenant sin un contrato de producto y datos que lo respalde.

## Trabajo autorizado

1. Leer estas reglas, las más cercanas y la fuente interna del cambio. Para APIs
   de librerías, consultar documentación oficial de la versión instalada.
2. Ante un fallo, consultar la sección específica y troubleshooting antes de
   cambiar la implementación o repetir sin nueva evidencia.
3. Para comportamiento no trivial, mantener propuesta, diseño, escenarios y tareas
   en OpenSpec. Las correcciones documentales se resuelven directamente.
4. Antes de una pantalla, definir usuario, objetivo, decisión, información mínima
   y acción principal. Antes de una operación sensible, definir acceso, validación,
   repetición, concurrencia, auditoría y límites de proveedores.
5. Implementar unidades coherentes y alinear contratos, migraciones y docs.
   Distinguir estado actual, requisitos nuevos y comprobaciones pendientes.
6. La solicitud del usuario fija alcance y autorización. Completar la implementación
   ya autorizada sin confirmaciones repetidas; una propuesta por sí sola es planificación.
7. Añadir o ejecutar pruebas cuando se solicite. Conservar criterios de calidad y
   reportar lo comprobado y lo pendiente; no declarar omitidas como correctas.
8. Commit, push y despliegue cuando se soliciten para ese trabajo. Conservar cambios
   ajenos; no forzar ni reescribir historial publicado sin autorización específica.

No cambiar tecnologías para encajar la plantilla. Una necesidad de seguridad
demostrada requiere evidencia, compatibilidad y ADR.

## Comandos

```bash
corepack pnpm install
corepack pnpm dev:local
corepack pnpm --filter @turismo/mobile android
corepack pnpm openspec list --json
corepack pnpm knowledge:init
corepack pnpm knowledge:update
```

`openspec` en las skills generadas significa `corepack pnpm openspec` aquí.
La versión y los doce workflows están en `openspec/tooling.json`. Usar el wrapper
para mantener el perfil completo y telemetría desactivada, sin alterar preferencias
globales. No editar skills `openspec-*`, comandos ni prompts generados.

Los comandos de pruebas/build existentes se describen en `docs/quality/testing.md`.
Instalar paquetes Expo desde su workspace con `corepack pnpm expo install`.

## Despliegue y credenciales

El destino previamente documentado es `turismo_vinculacion_app` en
`187.127.6.234:8004`, con rol de aplicación homónimo. Verificar la conexión,
`current_database()` y `current_user` antes de afirmar que una operación es de producción.
Las credenciales se consumen desde `~/.pgpass`, sin mostrarlas, copiarlas ni versionarlas.
Reservar la administración privilegiada para operaciones autorizadas.

Antes de modificar una base compartida, verificar respaldo, propietario, esquema
y permisos. No ejecutar runners locales, seeders de demostración, borrados de base
ni rollbacks automáticos sobre producción. Esta adopción no ejecuta migraciones.
