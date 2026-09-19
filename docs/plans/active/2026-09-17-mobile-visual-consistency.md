# Sistema visual móvil consistente

## Objetivo

Unificar la experiencia móvil turística con React Native Paper como único kit externo de
interfaz, una identidad verde bosque institucional y layouts adaptables a teléfonos en
orientación vertical y horizontal.

## Alcance

- Tokens de color, tipografía, espaciado, radios, iconos, elevación y alturas.
- Tema Paper claro/oscuro y componentes `Tourism*` reutilizables.
- Chips de categorías con altura/padding normalizados y acción de filtros separada con icono.
- Pantallas Explorar, Agente, Itinerario, Ruta, Ficha y Configuración.
- Shell compartido para encabezado, safe area, márgenes, superficies y navegación inferior.
- Menú lateral global en lugar del botón de perfil, con Guardados, Mi itinerario y
  Configuración.
- Retiro de NativeWind/Tailwind únicamente de `apps/mobile`.
- Documentación de arquitectura y reglas del móvil.

La aplicación web y su futuro repositorio quedan fuera de alcance.

## Decisiones

- Paper será el único kit externo de componentes; `StyleSheet` seguirá siendo la API nativa
  de layout y los componentes `Tourism*` serán la capa de producto.
- Verde bosque institucional para acciones y selección; blancos/superficies neutras en claro
  y equivalentes oscuros con contraste accesible.
- Fuente del sistema y escala tipográfica única, compacta para móvil: display 28/36,
  title 22/28, heading 18/24, body 16/24, label 14/20 y caption 12/16.
- El acceso transversal se realiza mediante un botón `menu` y `TourismMenuDrawer`; en las
  vistas principales el botón ocupa el cuarto elemento de la barra inferior, mientras que
  las pantallas sin barra conservan el acceso en su encabezado. El perfil deja de ser el
  control de navegación principal.
- Expo permitirá orientación vertical y horizontal mediante layouts con `useWindowDimensions`.
- No se usan maquetas externas como fuente de diseño.

## Verificación

- `corepack pnpm install`
- `corepack pnpm --filter @turismo/mobile typecheck`
- `corepack pnpm --filter @turismo/mobile lint`
- `corepack pnpm --filter @turismo/mobile test`
- `corepack pnpm --filter @turismo/mobile format`
- Smoke visual en Android/iOS, claro/oscuro, texto ampliado y ambas orientaciones.

## Estado

Tokens, controles base y shell compartido implementados. La verificación automatizada del
cliente móvil está completa; queda la validación visual manual en un dispositivo físico
Android/iOS, en claro/oscuro y con texto ampliado.
