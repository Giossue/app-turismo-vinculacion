# Flujo de agente turístico y revisión institucional

## Objetivo

Separar la captura operativa de la revisión: `TURISTA` consume el contenido publicado,
`AGENTE_TURISTICO` crea y completa sus centros y registros de catastro, y
`ADMINISTRADOR` revisa el envío completo antes de aprobarlo y publicarlo.

## Matriz de capacidades

| Capacidad | TURISTA | AGENTE_TURISTICO | ADMINISTRADOR |
| --- | --- | --- | --- |
| Consultar contenido publicado | Sí | Sí | Sí |
| Crear/editar sus centros en borrador | No | Sí | Sí |
| Crear/editar sus catastros en borrador | No | Sí | Sí |
| Enviar centro o catastro a revisión | No | Sí | Sí |
| Ver y decidir revisiones | No | No | Sí |
| Publicar, desactivar y administrar catálogos | No | No | Sí |

## Decisiones

- El rol persistido se llama `AGENTE_TURISTICO`.
- Los centros conservan responsable y el borrador/revisión existente conserva el envío
  completo; el agente solo puede operar registros propios.
- Los establecimientos creados por un agente permanecen fuera del catálogo público hasta
  que el administrador los aprueba.
- La cola de revisión muestra una acción explícita para abrir la ficha completa en modo
  lectura antes de aprobar o rechazar.
- La API sigue siendo la frontera de autorización; ocultar acciones en el panel no basta.

## Verificación

- Migración idempotente de rol, responsables y estado de revisión del catastro.
- Pruebas negativas para turista/agente frente a revisión, publicación y registros ajenos.
- Pruebas de API, TypeScript, lint y verificación del panel web.
