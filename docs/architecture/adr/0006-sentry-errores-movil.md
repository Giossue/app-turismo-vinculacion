# ADR-0006: Sentry para errores y cierres del móvil

- Estado: aceptada
- Fecha: 2026-10-20

## Contexto

Los cierres y errores de Rumbo EC en teléfonos reales no llegan al equipo: solo se
conocen cuando alguien los reporta. La observabilidad ya listaba «crashes y versiones
de móvil» como señal sin implementación. La app maneja ubicación precisa y una sesión
de cuenta, por lo que cualquier reporte debe ser anónimo y sin coordenadas.

## Decisión

Usar `@sentry/react-native` (versión indicada por `expo install` para SDK 57) en
`apps/mobile`:

- Se inicializa solo si la compilación define `EXPO_PUBLIC_SENTRY_DSN`; sin DSN la
  app no inicializa ni envía nada.
- `sendDefaultPii: false`, sin usuario, capturas de pantalla, jerarquía de vistas,
  session replay ni trazas de rendimiento. Metro excluye el replay web del bundle.
- `beforeSend` y `beforeBreadcrumb` (`src/core/observability/error-report-privacy.ts`)
  eliminan cuerpos, cabeceras y cookies de peticiones, query y fragmento de URLs,
  correos, tokens y coordenadas, incluidas claves como `latitude` o `destination`.
- Un `Sentry.ErrorBoundary` en el layout raíz reporta errores de render y ofrece
  «Reintentar».
- El config plugin, que sube source maps durante el build, solo se añade cuando el
  entorno del build tiene `SENTRY_AUTH_TOKEN` (con `SENTRY_ORG` y `SENTRY_PROJECT`).
  Los secretos nunca se versionan.

## Alternativas

- Sin herramienta: depende de reportes manuales y no permite medir cierres por versión.
- Endpoint propio en la API: exige simbolización, agrupación y retención propias.
- Firebase Crashlytics: requiere Google Services en el build y no cubre la web.

## Consecuencias

- Requiere una cuenta y un proyecto de Sentry (o una instancia autoalojada). El DSN es
  público por diseño; el token de subida no.
- Los cambios del plugin solo llegan al dispositivo tras reconstruir el binario.
- El filtro puede ocultar números técnicos de alta precisión; se acepta para no
  enviar ubicación.
- Habilitar trazas, replay o un dato nuevo requiere actualizar este ADR y
  `docs/security/privacy-location.md`.
