# Plan: corregir listado administrativo sin filtros

## Objetivo

Evitar que la consulta de Centros turísticos genere SQL inválido cuando se selecciona
“Todos” y dejar un reintento explícito en el estado de error del panel.

## Verificación

- Ejecutar la consulta del servicio contra PostgreSQL local con estado y búsqueda vacíos.
- Verificar `GET /api/v1/admin/centers?limit=20&offset=0` autenticado.
- Ejecutar formato, lint, typecheck y pruebas de API; `bun run verify` en el panel.

## Resultado

Completado. La consulta usa `TRUE` como condición base cuando no hay filtros, el
endpoint devuelve `200` con el inventario vacío y el panel ofrece “Reintentar”. La base
local actualmente contiene cero centros turísticos, por lo que el estado vacío es
esperado después de corregir el error.
