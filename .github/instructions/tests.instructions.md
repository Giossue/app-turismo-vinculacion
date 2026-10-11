---
applyTo: "**/*.{test,spec}.{ts,tsx,dart}"
---

Seguir `docs/quality/testing.md`. Añadir/ejecutar pruebas cuando el usuario lo
solicite y reportar lo omitido. Cubre rechazo y permisos, no solo camino feliz. CI no
depende de servicios externos inestables; usa puertos y fakes. Las pruebas espaciales usan
PostgreSQL/PostGIS real, no SQLite.
