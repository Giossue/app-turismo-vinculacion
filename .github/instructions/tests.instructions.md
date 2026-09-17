---
applyTo: "**/*.{test,spec}.{ts,tsx,dart}"
---

Sigue `docs/quality/testing.md`. Cubre rechazo y permisos, no solo camino feliz. CI no
depende de servicios externos inestables; usa puertos y fakes. Las pruebas espaciales usan
PostgreSQL/PostGIS real, no SQLite.
