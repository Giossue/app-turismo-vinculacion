# Observabilidad

Las señales siguientes son criterios de operación. El móvil reporta errores y cierres
con Sentry cuando la compilación define `EXPO_PUBLIC_SENTRY_DSN` (ver «Errores del
móvil» y ADR-0006); no hay collectors, colas ni telemetría de servidor instalados. La auditoría editorial existente y health
se consultan en el código; no dar por disponibles todas las métricas de esta lista.

## Señales

- Health/readiness, latencia, tráfico y códigos de error.
- Consultas lentas, conexiones y almacenamiento PostgreSQL.
- Redis, colas, edad de jobs y fallos definitivos.
- MinIO, bytes, errores y objetos huérfanos.
- Mapas/rutas/IA/clima/correo: latencia, error, cuota y costo.
- Login fallido, rate limits y denegaciones relevantes.
- Publicaciones, importaciones y moderaciones.
- Crashes y versiones de móvil/web.

## Errores del móvil

- `src/core/observability/error-reporting.ts` inicializa Sentry solo con DSN; sin él no
  se envía nada y la app funciona igual.
- Reportes anónimos: `sendDefaultPii: false`, sin usuario, capturas, jerarquía de vistas,
  session replay ni trazas de rendimiento.
- `error-report-privacy.ts` filtra en `beforeSend`/`beforeBreadcrumb`: cuerpos, cabeceras
  y cookies de peticiones, query y fragmento de URLs, correos, tokens y coordenadas.
  Sus pruebas Vitest documentan cada caso; ampliar el filtro antes de adjuntar datos nuevos.
- `Sentry.ErrorBoundary` en `src/app/_layout.tsx` reporta errores de render y muestra
  «Algo salió mal» con «Reintentar».
- Source maps: el plugin `@sentry/react-native/expo` se añade solo si el build tiene
  `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` y `SENTRY_PROJECT` (variables o secretos de EAS).
  Sin token, el build no intenta subir nada y los stacks quedan sin simbolizar.

## Logging

JSON estructurado con correlation/request ID. Incluir IDs técnicos estables en logs, no en
mensajes públicos. Redactar tokens, emails cuando no sean necesarios, ubicación precisa,
payloads de IA y archivos.

## Alertas

Alertar solo cuando exista acción: servicio no disponible, error sostenido, disco bajo,
backup fallido, cola estancada, certificado próximo a vencer o consumo anormal.
