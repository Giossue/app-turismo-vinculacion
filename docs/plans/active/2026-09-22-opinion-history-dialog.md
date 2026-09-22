# Historial detallado de opiniones en el panel

Fecha: 2026-09-22
Estado: completado

## Objetivo

Simplificar la cola de opiniones y mover la información secundaria a un modal accesible
con el historial completo de versiones y moderaciones.

## Alcance

- Mantener en la tabla únicamente lugar, usuario, estado, calificación y acciones.
- Añadir `GET /admin/opinions/:reviewCode/history`, protegido para `ADMINISTRADOR`.
- Devolver versiones, estados, fechas, comentarios y decisiones de moderación sin exponer
  IDs internos.
- Abrir el detalle bajo demanda y conservar aprobar/rechazar dentro del flujo modal.

## Reglas

- El historial solo es visible para administradores autenticados.
- Las versiones se muestran en orden descendente y la versión publicada/anterior se distingue
  de una pendiente, rechazada o reemplazada.
- El modal no permite moderar versiones que ya no estén pendientes.
- El cierre del modal conserva la página y el estado de la cola.

## Verificación

- Prueba de servicio para devolver todas las versiones y moderaciones.
- Typecheck, lint, pruebas y build del API.
- Formato, lint, typecheck y build del panel web.
