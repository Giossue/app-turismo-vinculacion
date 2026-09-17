# Índice de arquitectura

## Orden de lectura

1. `ARCHITECTURE.md`
2. `stack.md`
3. `bootstrap.md`
4. Documento específico: `mobile.md`, `web.md` o `backend.md`
5. `authentication.md` y `database.md`
6. `maps-navigation.md`, `ai.md` o `integrations.md` según la tarea
7. `deployment.md`
8. ADRs en `adr/`

## Reglas

- Registrar decisiones costosas o difíciles de revertir mediante ADR.
- Mantener límites comprobables mediante tipos, pruebas o lint.
- Generar clientes desde OpenAPI; no duplicar contratos TypeScript a mano.
- Favorecer el monolito modular hasta que métricas demuestren otra necesidad.
