# Decisiones de la feature

| Fecha | Decisión | Razón | Consecuencia |
| --- | --- | --- | --- |
| 2026-09-20 | Separar `opiniones` de `opinion_versiones` | Una edición pendiente no debe sobrescribir lo publicado | Se conserva historial y se puede rechazar sin perder la versión pública |
| 2026-09-20 | Eliminar `OCULTA` del flujo | Una opinión rechazada no debe contar; no se necesita un estado ambiguo | Las versiones usan `RECHAZADA` y las aprobadas anteriores pueden quedar `REEMPLAZADA` |
| 2026-09-20 | Usar códigos UUID públicos para versiones | Evitar exponer IDs internos en las rutas administrativas | La API identifica moderaciones por un código opaco |
