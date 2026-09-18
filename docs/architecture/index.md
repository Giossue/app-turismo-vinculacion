# Índice de arquitectura

## Orden de lectura

1. `../README.md` para ubicar la tarea y sus fuentes oficiales.
2. `ARCHITECTURE.md`
3. `stack.md`
4. `bootstrap.md`
5. Documento específico: `mobile.md`, `web.md` o `backend.md`
6. `authentication.md` y `database.md`
7. `maps-navigation.md`, `ai.md` o `integrations.md` según la tarea
8. `deployment.md`
9. ADRs en `adr/`

## Reglas

- Registrar decisiones costosas o difíciles de revertir mediante ADR.
- Mantener límites comprobables mediante tipos, pruebas o lint.
- Generar clientes desde OpenAPI; no duplicar contratos TypeScript a mano.
- Favorecer el monolito modular hasta que métricas demuestren otra necesidad.
- Consultar la documentación oficial enlazada por `docs/README.md` antes de implementar y
  volver a ella cuando una herramienta o integración falle.
