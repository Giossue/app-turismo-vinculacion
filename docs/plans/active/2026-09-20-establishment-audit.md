# Auditoría de mutaciones del catastro

Fecha: 2026-09-20
Estado: completado (2026-09-20)

## Alcance

Registrar en la tabla existente `auditoria_catalogos` las altas, modificaciones,
desactivaciones y reactivaciones de `establecimientos_turisticos`. No se importa el
catastro nacional, no se añaden columnas ni se crea una tabla nueva.

## Decisión de persistencia

Se reutiliza `auditoria_catalogos` con `catalogo_codigo = 'ESTABLISHMENT'`. Una migración
solo amplía las restricciones de valores permitidos (`CREAR`, `MODIFICAR`, `ACTIVAR` y
`DESACTIVAR`); conserva el trigger de inmutabilidad, el actor, la fecha y los JSONB de
antes/después ya existentes.

## Controles

- Todas las mutaciones administrativas siguen protegidas por `ADMINISTRADOR`.
- La escritura del establecimiento y su auditoría ocurre en la misma transacción.
- Se bloquea la fila antes de calcular el estado anterior para evitar auditorías cruzadas
  en ediciones concurrentes.
- La consulta de historial solo devuelve registros del establecimiento solicitado.
- El snapshot privado se limita a los campos actuales de la tabla; no se agrega información
  de proveedores externos ni se expone en la consulta pública.

## Verificación

- Pruebas unitarias de alta, edición, activación/desactivación y lectura del historial.
- Migración aplicada sobre la base remota y comprobación de la restricción/triggers.
- `lint`, `typecheck`, pruebas API y `git diff --check`.

## Resultado

La migración fue aplicada en la base remota y se comprobó en una transacción revertida
que acepta eventos `ESTABLISHMENT` sin desactivar el trigger de inmutabilidad. La API
quedó con auditoría transaccional para las cuatro mutaciones y lectura administrativa por
`GET /admin/establishments/:id/audit`. Las 88 pruebas de API, lint y typecheck pasan.
