## 1. API

- [x] 1.1 `searchPlaces` unifica las seis herramientas de descubrimiento
- [x] 1.2 Con `nearby`, radio real y `outsideRadius` cuando está vacío; comida y alojamiento filtrados por tipo
- [x] 1.3 Actualizar prompt, intenciones forzadas y respuestas de respaldo
- [x] 1.4 Reintentar en modo automático si el proveedor rechaza `tool_choice` forzado (p. ej. `claude-sonnet-5-5`)

## 2. Pruebas y docs

- [x] 2.1 Pruebas con modelo simulado (nombre, radio vacío, herramientas ofrecidas)
- [x] 2.2 Actualizar `docs/architecture/ai.md` y los documentos de vinculación
- [ ] 2.3 Revisar en producción, con las trazas, cómo usa el modelo las herramientas
