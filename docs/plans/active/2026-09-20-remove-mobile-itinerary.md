# Retiro del itinerario móvil

Fecha: 2026-09-20

## Objetivo

Retirar de la app móvil la pantalla y los accesos al itinerario hasta que exista un modelo
persistente y un contrato de API para itinerarios, jornadas y visitas.

## Alcance

- Eliminar la ruta y los datos demo del itinerario.
- Retirar la pestaña y las acciones del menú lateral.
- Mantener intacta la API, la base de datos y la hoja de ruta futura del producto.
- Actualizar la arquitectura y planes móviles para reflejar las dos pestañas disponibles.

## Verificación

- Buscar referencias de itinerario en `apps/mobile/src`.
- Ejecutar typecheck, lint, pruebas y formato del móvil.
