# Opiniones publicadas en administración y ficha móvil

## Objetivo

Mantener visible en el panel la opinión después de aprobarla, conservar los encabezados de la tabla cuando no existan filas y evitar que el móvil muestre únicamente el estado propio mientras conserva una lista pública vacía en caché.

## Alcance

- Extender la consulta administrativa de opiniones para devolver una fila por opinión activa: versiones pendientes y versiones ya publicadas.
- Exponer el estado de la fila para que el panel distinga `PENDIENTE` de `PUBLICADA` y solo permita moderar pendientes.
- Mantener el encabezado y la estructura de las tablas administrativas durante el estado vacío.
- Revalidar opiniones públicas al montar la pestaña móvil y cuando el estado propio ya tenga una versión aprobada.
- Añadir pruebas de mapeo/contrato y actualizar la especificación de la feature.

## Fuera de alcance

- Cambiar las reglas de moderación, autorización o publicación.
- Mostrar opiniones rechazadas como contenido público o administrativo activo.
- Crear notificaciones push.
- Modificar el esquema de PostgreSQL.

## Archivos previstos

- `apps/api/src/opinions/opinions.service.ts`
- `apps/api/src/opinions/opinions.controller.ts`
- `apps/api/test/opinions.service.spec.ts`
- `apps/mobile/src/features/opinions/application/use-center-opinions.ts`
- `apps/mobile/src/features/opinions/presentation/center-opinions.tsx`
- `web-turismo-admin/src/components/ui/admin-table.tsx`
- `web-turismo-admin/src/components/admin/opinion-management.tsx`
- `web-turismo-admin/src/lib/admin-api.ts`
- `docs/product/features/opinions/specification.md`

## Riesgos y controles

- Una versión aprobada no debe volver a entrar en la cola de moderación: la API devuelve su estado y la UI oculta las acciones.
- Una edición pendiente debe conservar la versión aprobada anterior: la consulta administrativa mantiene ambas representaciones.
- El móvil no debe fabricar contenido público a partir del estado propio: solo revalida la consulta pública de la API.
- El cambio del componente de tabla debe conservar estados de carga y paginación existentes.

## Migraciones

No se requiere migración. La implementación usa `opiniones.version_publicada_id` y `opinion_versiones` existentes.

## Verificación

- Pruebas unitarias de API para filas pendientes y publicadas.
- Formato, lint, typecheck, tests y build de API/móvil.
- `bun run verify` del panel administrativo.
- Revisión del diff y comprobación del endpoint público contra la base desplegada.

## Estado

En progreso.
