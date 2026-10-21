# Proposal

## Why

Los cierres y errores de la app en teléfonos reales solo se conocen cuando alguien los reporta. Sin stacks ni versión afectada, no se pueden priorizar ni comprobar las correcciones. La app maneja ubicación precisa y una sesión de cuenta, así que el reporte debe ser anónimo.

## What Changes

- Integrar `@sentry/react-native` en el móvil, activo solo cuando la compilación define `EXPO_PUBLIC_SENTRY_DSN`.
- Filtrar cada evento y breadcrumb antes de enviarlo: sin usuario, cuerpos, cabeceras, cookies, query de URLs, correos, tokens ni coordenadas.
- Envolver el layout raíz en un `ErrorBoundary` que reporta y muestra «Algo salió mal» con «Reintentar».
- Subir source maps solo en builds con `SENTRY_AUTH_TOKEN`; sin token el build no cambia.
- Documentar la decisión (ADR-0006), la observabilidad, la integración y la privacidad.

## Capabilities

### New Capabilities

- `mobile-error-reporting`: reporte anónimo y opcional de errores y cierres del móvil.

### Modified Capabilities

Ninguna.

## Impact

Móvil Expo/React Native: nueva dependencia nativa `@sentry/react-native`, Metro con debug IDs y config plugin condicional. Requiere reconstruir el binario para el SDK nativo. Sin cambios en la API ni migraciones. El usuario debe crear la cuenta/proyecto de Sentry y definir el DSN (y, para source maps, el token) en el entorno de build.
