# Cierre funcional del chatbot turístico

> Esta unidad textual forma parte del alcance integral solicitado el 2026-09-24;
> ver `2026-09-24-tourism-agent-complete.md` para los requisitos restantes.

## Objetivo

Completar el flujo conversacional móvil y la generación de la API para que una
consulta pueda enviarse, detenerse, recuperarse tras un fallo y continuarse al
reabrir la sheet, sin perder el control de datos publicados ni de la ubicación.

## Estado inicial

- Ya existen SSE, respuesta estructurada, tarjetas, fuentes, itinerarios
  temporales y propuestas de ruta con confirmación.
- La conversación vive dentro del contenido de la sheet; su ciclo de vida puede
  descartarla al cerrar. No hay acciones de detener, reintentar o comenzar de nuevo.
- La API mantiene la generación activa si el cliente desconecta del SSE.
- Los itinerarios persistentes y voz siguen como unidades de producto separadas;
  el alcance de esta entrega se ajustará a la prioridad indicada por el usuario.

## Criterios de aceptación

- Una respuesta en curso se puede detener desde la app y al cerrar el chat.
- Un error deja disponible una acción de reintento sin duplicar la pregunta.
- Una conversación completada sigue visible al cerrar y reabrir la sheet durante
  la sesión de Explorar, y existe una acción explícita para comenzar una nueva.
- La desconexión del SSE aborta la llamada al proveedor y no intenta escribir en
  una conexión cerrada.
- El historial enviado solo incluye intercambios completados; no se guarda
  ubicación ni se envían respuestas parciales o erróneas como contexto.
- Pruebas de dominio, stream/controlador y verificaciones de tipos, lint y formato.

## Restricciones

- Sin navegación automática, escritura por el modelo ni contenido sin publicar.
- Sin persistir conversación o ubicación en el dispositivo/servidor hasta contar
  con una política de retención y borrado aprobada para esta función.

## Progreso de la unidad textual

- [x] Detener la respuesta desde el compositor o al cerrar la sheet.
- [x] Reintentar el último turno fallido sin duplicarlo ni enviar respuestas
      parciales al modelo.
- [x] Conservar conversación y borrador en memoria al reabrir la sheet; empezar
      una nueva conversación y limpiar el estado al cambiar de cuenta.
- [x] Abortar la generación de AI SDK cuando el cliente cierra el SSE.
- [x] Pruebas de reintento y desconexión; suites completas, tipos, formato,
      lint de los archivos del chatbot y diff.
- [ ] Lint móvil global al terminar la edición concurrente del menú: el cambio
      en `tourism-navigation.tsx` empezó a fallar por `react-hooks/refs` después
      de la primera pasada de lint; ese archivo es ajeno a esta unidad.
- [ ] Validación con un proveedor real: este checkout no tiene una clave de IA
      local configurada.

## Continuación

El alcance posterior se desarrolla en `2026-09-24-tourism-agent-complete.md` con
contratos de historial opt-in, itinerarios persistentes, voz, foto y apoyo editorial.
