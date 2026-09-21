# Historial visible de revisión de fichas

## Objetivo

Conservar en la sección administrativa de revisión las fichas pendientes y las que ya fueron aprobadas, para que una aprobación no haga desaparecer inmediatamente el registro de la tabla.

## Alcance

- Agregar un filtro de API para la cola `EN_REVISION` + `APROBADO`.
- Mantener las acciones de aprobar/rechazar únicamente para filas `EN_REVISION`.
- Mostrar las fichas aprobadas con su estado y sin acciones destructivas.
- Actualizar la especificación y cubrir el filtro administrativo con pruebas.

## Fuera de alcance

- Cambiar la publicación pública o el estado base `PUBLICADO`.
- Mostrar fichas rechazadas en la cola.
- Crear un historial completo de todas las revisiones.

## Archivos previstos

- `apps/api/src/admin/admin.dto.ts`
- `apps/api/src/admin/admin-centers.service.ts`
- `apps/api/test/admin-centers.service.spec.ts`
- `web-turismo-admin/src/components/admin/admin-shell.tsx`
- `web-turismo-admin/src/lib/admin-api.ts`
- `docs/product/features/admin-center-capture/specification.md`

## Riesgos y controles

- El filtro agrupado no debe confundirse con un estado persistido: `REVIEW_QUEUE` solo es una consulta administrativa.
- Una ficha aprobada no debe volver a mostrar botones de moderación.
- La ficha pública sigue dependiendo de `PUBLICADO`; la cola administrativa no altera esa visibilidad.

## Migraciones

No se requiere migración.

## Verificación

- Prueba de servicio para el filtro agrupado.
- Formato, lint, typecheck, tests y build de API.
- Formato, lint, typecheck y build del panel.

## Estado

En progreso.
