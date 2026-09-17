# Observabilidad

## Señales

- Health/readiness, latencia, tráfico y códigos de error.
- Consultas lentas, conexiones y almacenamiento PostgreSQL.
- Redis, colas, edad de jobs y fallos definitivos.
- MinIO, bytes, errores y objetos huérfanos.
- Mapas/rutas/IA/clima/correo: latencia, error, cuota y costo.
- Login fallido, rate limits y denegaciones relevantes.
- Publicaciones, importaciones y moderaciones.
- Crashes y versiones de móvil/web.

## Logging

JSON estructurado con correlation/request ID. Incluir IDs técnicos estables en logs, no en
mensajes públicos. Redactar tokens, emails cuando no sean necesarios, ubicación precisa,
payloads de IA y archivos.

## Alertas

Alertar solo cuando exista acción: servicio no disponible, error sostenido, disco bajo,
backup fallido, cola estancada, certificado próximo a vencer o consumo anormal.
