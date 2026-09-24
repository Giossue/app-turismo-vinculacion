# Expo HAS CHANGED

Read `docs/README.md` to locate the relevant project decision and the exact versioned docs at
https://docs.expo.dev/versions/v57.0.0/ before writing any code. If a command, build, test or
runtime integration fails, consult the matching official API/troubleshooting section before
changing the implementation or trying another workaround.

## Versiones y reglas de plataforma

Este paquete usa Expo `~57.0.24`, Expo Router `~57.0.22`, React Native `0.86.3` y React
`19.2.3`. Instala dependencias Expo con `corepack pnpm expo install` y verifica siempre la
compatibilidad en la documentación versionada antes de actualizar. Los cambios de
`app.json`/`app.config.*` o config plugins solo llegan al dispositivo después de regenerar
y reconstruir el binario; Fast Refresh no sustituye un prebuild/dev build.

Expo Router es file-based: usa sus layouts, rutas, `useRouter` y `Link`, sin un
`NavigationContainer` propio ni imports de paquetes externos `@react-navigation/*` en
código de aplicación.

React Native Paper es el único kit externo de componentes de este paquete. Las pantallas
usan componentes `Tourism*` y tokens Turismo; `StyleSheet` queda para layout nativo. No
añadir NativeWind, Tailwind ni otra librería visual al móvil. La versión web se mantiene
fuera de este paquete y se desarrollará en otro repositorio.

Las pantallas secundarias deben montarse dentro de `TourismScreenFrame` para compartir safe
area, encabezado, ancho máximo y márgenes. `Explorar` y `Cómo llegar` (`route.tsx`) son las
excepciones de mapa a pantalla completa y reutilizan los mismos tokens. Las pantallas
principales (`Explorar` y `Guardados`) comparten la barra inferior `TourismTabBar`, cuya
acción `Menú` abre la hoja de menú de `TourismMenuProvider` (cabecera de perfil, entradas y
«Cerrar sesión» al final).

Los controles que flotan sobre el mapa (buscador, chips, botones y barra inferior) y los
paneles de ruta usan vidrio con `TourismGlassFill` de
`src/core/ui/tourism-glass.tsx` (material del sistema de `expo-blur`). Las sheets de
Explorar y la hoja de menú usan una superficie sólida y opaca en todas sus alturas.
El fondo que se desenfoca va en `TourismGlassScope` y lo flotante como hermano, nunca dentro
(Android lo exige). Las pantallas de fondo liso (listas, formularios) mantienen superficies
sólidas: ahí el vidrio no aporta.

Toda sheet o panel inferior (fichas del mapa, panel de ruta, agente) usa
`TourismSheetHandle` (`src/core/ui/tourism-sheet-handle.tsx`): barra de arrastre centrada y
botón de cerrar a su altura, arriba a la derecha. No se crean asas ni botones de cerrar
propios en los encabezados, ni estilos sueltos: las medidas viven en `tokens.ts`.

Antes de escribir utilidades o componentes nuevos, reutiliza los módulos compartidos
listados en `docs/architecture/mobile.md` (sección «Módulos compartidos»): geografía,
formatos, cliente HTTP, claves de consulta y componentes `Tourism*`.

Para diseño adaptable usa puntos independientes de densidad, Flexbox, porcentajes,
`useWindowDimensions` y `fontScale`; no asumas píxeles físicos. Usa `PixelRatio` solo para
integraciones que necesiten la densidad real. Usa `StyleSheet` y los
tokens/ componentes tipográficos compartidos del proyecto: en arrays `style` gana el último
elemento y `Text` tiene herencia limitada. Mantén objetivos táctiles de 44dp o más, añade
`hitSlop` sin salir de los límites del padre y configura ripple/feedback por plataforma.

Solicita permisos de ubicación solo al activar la función; foreground antes de background,
y background solo después de habilitar explícitamente la función correspondiente, con
consentimiento y permiso del sistema. Si cambias la configuración nativa de permisos,
reconstruye la app. Todo control no textual necesita
`accessibilityLabel`/estado; prueba TalkBack y VoiceOver.

Fuentes: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [Expo Location](https://docs.expo.dev/versions/v57.0.0/sdk/location/), [Expo Router](https://docs.expo.dev/router/introduction/), [Style RN 0.86](https://reactnative.dev/docs/0.86/style), [dimensiones](https://reactnative.dev/docs/0.86/height-and-width), [useWindowDimensions](https://reactnative.dev/docs/0.86/usewindowdimensions), [PixelRatio](https://reactnative.dev/docs/0.86/pixelratio), [Text](https://reactnative.dev/docs/0.86/text), [Pressable](https://reactnative.dev/docs/0.86/pressable), [BackHandler](https://reactnative.dev/docs/0.86/backhandler) y [accesibilidad](https://reactnative.dev/docs/0.86/accessibility).

## UI declarativa y overlays

Mantén una única fuente de verdad para el estado visible. Los bottom sheets, fichas y
otros overlays transitorios se cierran o desmontan explícitamente antes de navegar a otra
pantalla; una nueva ruta no debe depender de ocultarlos implícitamente.

## Historial y botón Atrás

El stack de Expo Router solo representa pantallas. Zoom, paneo, scroll, filtros y demás
estado efímero no deben convertirse en entradas del stack ni deshacerse con Atrás. En
Android, la pantalla enfocada cierra primero sus overlays y luego hace un único `back` de
navegación. Las pestañas se cambian con `replace`; `push` queda para fichas, rutas y
otras pantallas secundarias que sí deben conservar un regreso.

## Anotaciones del mapa

Los centros públicos estáticos deben renderizarse con `GeoJSONSource` y `Layer` `symbol`
de MapLibre, dejando el clustering en el motor nativo. No crear un `Marker` o una vista
React por cada centro: los iconos se registran con `Images` y las capas se mantienen
estables durante zoom y paneo. Los clusters pueden tener su propia capa visual separada.
La selección de un centro debe mantener el código seleccionado en el estado de pantalla y
abrir la ficha enseguida, mientras la cámara se mueve al zoom predeterminado; la cámara
centra el pin en la parte visible del mapa, encima de la ficha (padding inferior). Los pines no cambian
de tamaño ni de icono al seleccionarse: no hay capa ni estilo de pin seleccionado.
Los catastros llegan como teselas vectoriales (`VectorSource` sobre
`GET /establishments/tiles/{z}/{x}/{y}`), nunca como una lista JSON por viewport: MapLibre
pide, cachea y descarta las teselas, y los chips filtran con el `filter` de la capa sin
nuevas peticiones. Los datos de la ficha salen de las propiedades del feature tocado.
