# Tasks

## 1. Integración

- [x] 1.1 Instalar `@sentry/react-native` con `expo install` y permitir el script de `@sentry/cli`.
- [x] 1.2 Inicializar solo con `EXPO_PUBLIC_SENTRY_DSN`, sin PII, capturas, jerarquía, replay ni trazas.
- [x] 1.3 Metro con debug IDs y sin replay web; plugin de source maps solo con `SENTRY_AUTH_TOKEN`.
- [x] 1.4 `ErrorBoundary` en el layout raíz con «Algo salió mal» y «Reintentar».

## 2. Privacidad

- [x] 2.1 Filtrar eventos y breadcrumbs: cuenta, cuerpos, cabeceras, cookies, query, correos, tokens y coordenadas.
- [x] 2.2 Pruebas Vitest del filtro.

## 3. Documentación y comprobación

- [x] 3.1 ADR-0006, observabilidad, integraciones, privacidad y `.env.example`.
- [x] 3.2 Comprobar tipos, lint, Vitest, `expo config` con y sin token y export Android/web.
- [ ] 3.3 Crear el proyecto de Sentry, definir DSN y token en el build y verificar un reporte real en un dispositivo.
