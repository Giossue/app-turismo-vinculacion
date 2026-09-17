# Modelo de amenazas

## Activos

- Cuentas, roles y tokens.
- Fichas no publicadas y decisiones de revisión.
- Ubicación y preferencias de turistas.
- Fotografías, videos, firmas y documentos.
- Base turística oficial y auditoría.
- Credenciales de rutas/tiles privados, IA, correo, notificaciones y almacenamiento.

## Fronteras

- Móvil/web ↔ API.
- API/worker ↔ PostgreSQL, Redis y MinIO.
- API ↔ proveedores externos.
- Guía ↔ revisión/publicación.
- Contenido externo ↔ contexto de IA.
- CI/despliegue ↔ producción.

## Amenazas y controles

| Amenaza | Impacto | Controles principales |
| --- | --- | --- |
| Escalación de rol | publicación no autorizada | guards, ownership, pruebas negativas, auditoría |
| Enumeración de cuentas | privacidad/ataque | respuestas uniformes, rate limit |
| Robo de refresh token | secuestro de sesión | hash, rotación, reuse detection, revocación |
| Exposición de ubicación | riesgo personal | consentimiento contextual, minimización, retención |
| Archivo malicioso | ejecución/abuso | límites, MIME/contenido, cuarentena, nombres generados |
| Prompt injection | respuesta falsa/exfiltración | herramientas cerradas, contenido como dato, sin secretos |
| Publicación de borrador | información incorrecta | filtro central `PUBLICADO`, pruebas y caché invalidada |
| Abuso de IA/mapas-rutas | costo/indisponibilidad | cuotas, rate limits, alertas y degradación |
| Importación corrupta | pérdida de integridad | staging, validación, idempotencia y reporte |
| Pérdida del servidor | pérdida de datos | backups independientes y restauración probada |
| Redis indisponible | jobs/caché afectados | PostgreSQL fuente de verdad y recuperación de colas |
