# Proposal

## Why

Cuando alguien reporta que el agente falló no hay forma de saber qué preguntó ni qué consultó la IA: el historial solo se guarda con consentimiento y ningún cliente lo activa, así que `conversaciones_ia` y `mensajes_ia` están vacías en producción.

## What Changes

- Cada turno de `/ai/chat` y `/ai/chat/stream` se guarda en `conversaciones_ia`/`mensajes_ia`: pregunta (`USER`), cada herramienta con entrada y salida (`TOOL`), respuesta con fuentes (`ASSISTANT`) y, si falla, el error (`SYSTEM`).
- Sin opt-in la conversación queda con `historial_voluntario = false`: no se lista, no se devuelve su id y se purga a los 30 días.
- Con opt-in el comportamiento visible no cambia.
- Sin tablas, columnas ni migraciones nuevas.

## Capabilities

### Modified Capabilities

- `tourism-agent`: registro interno de diagnóstico de cada turno.

## Impact

API (`AgentHistoryService`, `AiAgentController`, `AiAgentService`). Cambia la política de privacidad: se guardan preguntas de personas que no activaron el historial (decisión del usuario, 2026-10-28). Actualiza `docs/architecture/ai.md` y la feature `tourism-agent`.
