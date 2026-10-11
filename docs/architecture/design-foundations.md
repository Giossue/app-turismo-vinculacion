# Fundamentos visuales

El móvil conserva Paper y los tokens de `apps/mobile/src/core/ui/tokens.ts`,
`theme.ts` y `theme-context.tsx`. Dimensiones en dp, Flexbox y `fontScale`;
usar `PixelRatio` solo para una integración que necesite densidad física.

| Fundamento  | Aplicación local                                                 |
| ----------- | ---------------------------------------------------------------- |
| Color       | Tema compartido, contraste y estado; no comunicar solo por color |
| Tipografía  | Componentes `Tourism*`, escala legible y texto ampliado          |
| Espacio     | Tokens y `TourismScreenFrame`; evitar medidas aisladas repetidas |
| Superficie  | Sheets sólidas; controles del mapa con `TourismGlassFill`        |
| Movimiento  | Reanimated/gestos existentes y reducción de movimiento           |
| Interacción | Objetivos táctiles de al menos 44dp y feedback de plataforma     |

Los nombres `TourismGlass*` describen estética, sin blur ni captura del fondo.
El esquema inicial puede seguir el sistema; Configuración ofrece el interruptor
claro/oscuro. Esta preferencia es distinta de la inicialización clara del panel MUI.

Las reglas específicas de MapLibre, fuentes y overlays están en `apps/mobile/AGENTS.md`.
Conservar los parches nativos documentados en [native-patches.md](native-patches.md).
El panel tiene sus tokens propios; no compartir estilos CSS con React Native.
