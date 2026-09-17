---
applyTo: "apps/api/**/*,apps/worker/**/*,database/**/*"
---

Sigue `docs/architecture/backend.md`, `authentication.md` y `database.md`. Mantén dominio
independiente, autorización por registro, transacciones explícitas, consultas parametrizadas
y OpenAPI actualizado. PostgreSQL es la fuente de verdad; Redis no lo sustituye.
