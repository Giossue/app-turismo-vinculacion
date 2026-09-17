# Rediseño móvil map-first y agente turístico

## Objetivo

Implementar en React Native/Expo la propuesta de Stitch como una experiencia móvil
map-first coherente: `Explorar`, `Agente` e `Itinerario`, con perfil/guardados en un
popover superior, tema claro/oscuro adaptable, tokens centralizados y Lucide para la
iconografía.

## Decisiones

- Expo SDK 57 y MapLibre se mantienen.
- `@expo/ui/community/bottom-sheet` se usará para la ficha arrastrable.
- Paper queda limitado a infraestructura puntual; los controles visibles usan primitivas
  de Turismo.
- Rutas e itinerarios usan fixtures tipados y etiquetados como demostración hasta contar
  con sus APIs.
- AI Elements no se usa en móvil: el agente nativo usa componentes propios y AI SDK Core
  en el backend.
- El proveedor del agente se selecciona por entorno (`AI_PROVIDER`, `AI_MODEL`,
  `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`); ninguna clave llega al móvil.

## Verificación

- `corepack pnpm --filter @turismo/mobile typecheck`
- `corepack pnpm --filter @turismo/mobile lint`
- `corepack pnpm --filter @turismo/mobile test`
- `corepack pnpm --filter @turismo/mobile format`
- Development Build Android con modo claro/oscuro, texto aumentado, mapa, sheet y
  navegación sin GPS.
- API: pruebas de selección de proveedor, claves faltantes, streaming, herramientas
  restringidas a datos publicados y tarjetas con fuentes.

## Estado

En implementación.
