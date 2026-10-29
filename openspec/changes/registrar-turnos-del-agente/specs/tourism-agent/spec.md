## ADDED Requirements

### Requirement: Registro interno de diagnóstico de cada turno

La API SHALL guardar cada turno del agente, con o sin historial activado, en `conversaciones_ia` y `mensajes_ia`: la pregunta, cada herramienta llamada con su entrada y salida, la respuesta con sus fuentes y, si el turno falla, el error. Sin historial activado, la conversación SHALL quedar con `historial_voluntario = false`, no SHALL listarse ni devolverse al cliente y SHALL purgarse pasados 30 días. Los textos SHALL redactar pares de coordenadas antes de persistir.

#### Scenario: Turno sin historial activado
- **WHEN** una persona sin historial activado hace una pregunta
- **THEN** se guarda una conversación con `historial_voluntario = false` con mensajes `USER`, `TOOL` y `ASSISTANT`, y la respuesta no incluye `conversationId`

#### Scenario: Turno con error
- **WHEN** el agente falla antes de responder
- **THEN** se guarda la pregunta, las herramientas ya llamadas y un mensaje `SYSTEM` con el error, y el cliente recibe el mismo error de antes

#### Scenario: Registro vencido
- **WHEN** un registro interno supera 30 días
- **THEN** se elimina en la siguiente escritura, como máximo una vez por hora por proceso
