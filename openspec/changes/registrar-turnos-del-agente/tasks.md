## 1. API

- [x] 1.1 `AiAgentService.generate` informa cada herramienta (`onToolTrace`) con `onStepEnd`
- [x] 1.2 `AgentHistoryService.recordTurn` guarda siempre; `recordFailure` registra errores sin lanzar; purga a 30 días
- [x] 1.3 `AiAgentController` recoge la traza y registra fallos en `chat` y `chat/stream`

## 2. Pruebas y docs

- [x] 2.1 Pruebas de historial, controlador y servicio (modelo simulado)
- [x] 2.2 Actualizar `docs/architecture/ai.md` y la feature `tourism-agent`
- [ ] 2.3 Verificar en producción tras el despliegue que aparecen filas en `conversaciones_ia`
