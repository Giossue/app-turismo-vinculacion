# Design

## Context

ADR-0006 elige Sentry. `docs/security/privacy-location.md` prohíbe guardar puntos GPS en logs y exige minimizar datos personales. El proyecto ya compila Android con EAS/Gradle local y exporta web.

## Decisions

- **Activación por DSN.** `initErrorReporting()` se ejecuta al cargar `_layout.tsx` y retorna sin hacer nada si `EXPO_PUBLIC_SENTRY_DSN` está vacío. Así los builds locales y de desarrollo no envían nada salvo que se configure.
- **Filtro puro y probado.** `error-report-privacy.ts` no importa el SDK en tiempo de ejecución; Vitest cubre texto, URLs, breadcrumbs y eventos. Elimina claves sensibles (coordenadas, origen/destino, tokens, contraseñas, correo, cuerpos) y aplica patrones a los textos.
- **Sin datos extra.** `sendDefaultPii: false`, `attachScreenshot` y `attachViewHierarchy` en false, sin `tracesSampleRate`, sin replay; Metro usa `includeWebReplay: false`. No se usa `Sentry.wrap` para no registrar breadcrumbs de toques.
- **ErrorBoundary fuera de los providers.** El fallback usa React Native y tokens con el esquema del sistema porque el error puede venir de los providers de tema o Paper.
- **Plugin condicional.** `app.config.js` añade `@sentry/react-native/expo` solo con `SENTRY_AUTH_TOKEN`; el paso de subida fallaría el build sin credenciales. Organización y proyecto se leen de `SENTRY_ORG`/`SENTRY_PROJECT`.
- **Script de `@sentry/cli` permitido** en `pnpm-workspace.yaml` para descargar el binario de subida.

## Risks

- El filtro de decimales puede ocultar números técnicos de alta precisión.
- Errores nativos previos a `Sentry.init` no se reportan.
- Sin source maps los stacks de release quedan minificados.
