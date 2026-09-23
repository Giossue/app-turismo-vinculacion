# Arquitectura móvil

## Alcance

Una aplicación React Native/Expo para turistas. La captura y administración de fichas
pertenecen al panel web institucional; la app móvil no habilita flujos operativos.

## Organización por feature

```text
app/                 # Expo Router
src/
  core/
    api/ auth/ location/ storage/ telemetry/ ui/
  features/
    map/ discovery/ centers/ pois/ establishments/
    navigation/ transport/ favorites/ ai/
    field_capture/ profile/
```

Cada feature separa `domain`, `application`, `data` y `presentation` cuando la complejidad
lo amerita. Evitar capas ceremoniales para componentes triviales.

La navegación turística está organizada alrededor del mapa: `Explorar` muestra MapLibre y
una ficha rápida nativa; el `Agente` se abre como un botón flotante sobre el mapa y una
sheet nativa de conversación; `Cómo llegar` representa la ruta activa sin solicitar GPS
en la vista previa. El planificador de itinerarios queda fuera de la app móvil hasta que
exista un modelo persistente y un contrato público.
El agente turístico consulta la API autenticada y valida una respuesta estructurada con
texto, tarjetas, acciones propuestas y fuentes. Las tarjetas de centros publicados abren su
ficha; las tarjetas de catastro muestran únicamente campos públicos. Una acción de ruta se
presenta como propuesta y requiere confirmación explícita antes de navegar a `/route`. La
app puede enviar una ubicación puntual redondeada para consultas cercanas, sin historial ni
seguimiento en segundo plano.

La preferencia de apariencia se administra desde `Menú > Configuración`. El proveedor de
tema mantiene una única fuente de verdad (`system`, `light` o `dark`), la persiste en
AsyncStorage y expone el esquema efectivo a los tokens, Paper, MapLibre y la barra de estado.
El cambio no crea una ruta adicional ni altera el historial de navegación.

## Compatibilidad y referencias de plataforma

El cliente se mantiene alineado con Expo SDK `~57.0.24`, Expo Router `~57.0.22`, React
Native `0.86.3` y React `19.2.3`. Las dependencias Expo se instalan con
`corepack pnpm expo install` para conservar las versiones compatibles del SDK. Los cambios
de configuración nativa y permisos requieren regenerar/reconstruir el binario; no se
consideran aplicados por Fast Refresh.

React Native Paper es el único kit externo de componentes del móvil. Los componentes
`Tourism*` exponen la identidad del producto y los tokens Turismo son su fuente visual;
`StyleSheet` se usa para layout nativo. NativeWind/Tailwind no forman parte de este cliente;
la web se desarrollará en un repositorio separado.

Las pantallas secundarias usan `TourismScreenFrame` como shell compartido. Este componente
centraliza safe areas, encabezado, ancho máximo de contenido y márgenes horizontales. La
pantalla principal vive en un `Tabs` de Expo Router para conservar la estructura de rutas,
pero el shell del mapa no renderiza barra inferior: el mapa ocupa toda la pantalla y sus
acciones efímeras no crean entradas de navegación. `Cómo llegar` (`src/app/route.tsx`) es
la otra excepción de mapa a pantalla completa: MapLibre ocupa toda la pantalla y el panel de
vista previa o el modo de navegación activa se dibujan encima con los mismos tokens y
controles `Tourism*`; la atribución del mapa se desplaza por encima de ellos. Si el enlace no
trae un destino válido, la ruta sí usa `TourismScreenFrame` con `Volver` y un estado de
error. El chat del agente se monta dentro de
una sheet nativa de altura completa sobre el mapa; no se cierra por gesto y muestra una `X`
en el encabezado. El compositor usa el manejo nativo de teclado y permanece sobre el área
visible cuando aparece el teclado del sistema.

El acceso al menú lateral se presenta en la fila superior, junto al buscador del mapa. Un
`TourismMenuProvider` posee un único drawer para el shell principal. Las pantallas
secundarias (ficha, ruta, cuenta, guardados, mapas sin conexión y configuración) no muestran
el botón de menú: su encabezado ofrece `Volver` y el drawer solo se abre desde `Explorar`.

Las decisiones de layout siguen las primitivas oficiales de React Native: dimensiones en
puntos independientes de densidad, Flexbox y `useWindowDimensions` para adaptación,
`fontScale` para texto ampliado, `StyleSheet`/tokens para estilos previsibles, componentes
tipográficos compartidos por la herencia limitada de `Text`, objetivos táctiles de 44dp o
mayores y accesibilidad explícita en controles no textuales. `PixelRatio` se reserva para
integraciones que necesiten densidad real. El back handler se registra y
limpia por pantalla, consume primero overlays y no convierte gestos efímeros en historial.

Referencias: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [Expo Location](https://docs.expo.dev/versions/v57.0.0/sdk/location/), [Expo TaskManager](https://docs.expo.dev/versions/v57.0.0/sdk/task-manager/), [Expo Speech](https://docs.expo.dev/versions/latest/sdk/speech/), [Expo Router](https://docs.expo.dev/router/introduction/), [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/), [MapLibre OfflineManager](https://maplibre.org/maplibre-react-native/docs/modules/offline-manager/), [Style RN 0.86](https://reactnative.dev/docs/0.86/style), [dimensiones](https://reactnative.dev/docs/0.86/height-and-width), [useWindowDimensions](https://reactnative.dev/docs/0.86/usewindowdimensions), [PixelRatio](https://reactnative.dev/docs/0.86/pixelratio), [Text](https://reactnative.dev/docs/0.86/text), [Pressable](https://reactnative.dev/docs/0.86/pressable), [BackHandler](https://reactnative.dev/docs/0.86/backhandler) y [accesibilidad](https://reactnative.dev/docs/0.86/accessibility).

## Módulos compartidos

Antes de crear una utilidad o un componente nuevo, reutilizar estos módulos del cliente:

- `src/core/geo`: `GeoCoordinate`, `GeoBounds`, `GeoBoundingBox`, `getDistanceMeters`
  (haversine), `offsetCoordinate`, `normalizeLongitude` y `getCoordinateBounds` (sin
  `Math.min(...spread)`).
- `src/core/format`: `appLocale` (`es-EC`), `formatDistance`/`formatOptionalDistance`,
  `formatDurationSeconds`, `formatClockTime`, `toIsoDate`, `formatLongDate` y
  `formatRelativeDate`.
- `src/core/api/http.ts`: `requestJson`, `sendRequest`, `assertResponseOk`,
  `parseJsonResponse`, `readApiErrorMessage`, `ApiError` e `isApiUnavailableError`. Los
  clientes `features/*/data/*-api.ts` los usan para que la UI nunca muestre errores de red o
  de JSON en inglés; las opciones de transporte se pasan como `{ apiUrl, fetcher, signal }`.
- `src/core/api/query-keys.ts`: prefijos de claves de TanStack Query, `ONE_DAY_MS` y las
  políticas de persistencia y de cierre de sesión. `src/core/api/media-url.ts`:
  `resolveMediaUrl` para fotografías servidas por la API.
- `src/core/storage/json-storage.ts`: `readJson`/`writeJson`/`removeJson` validados con zod.
- `src/core/location`: `getLocationAvailability` (permiso foreground y proveedor/GPS, con
  `locationUnavailableMessages`), `toCoordinate` e `isReliableLocationAccuracy`.
  `src/core/navigation/use-screen-back-handler.ts`: `useScreenBackHandler`.
- `src/core/navigation/search-params.ts`: `firstSearchParam`. Las rutas tipadas se construyen
  con `buildRouteHref`/`parseRouteSearchParams` (`features/routing/presentation/route-href.ts`)
  y `buildLoginHref`/`parseReturnTo` (`features/auth/application/login-href.ts`); no usar
  `as never` en los `href`.
- `src/core/ui`: además de los controles existentes, `TourismStateView` (carga, error y
  vacío), `TourismTabs`, `TourismInfoRow`, `TourismSection`, `TourismBottomSheet`,
  `TourismBottomSheetModal` y `TourismSheetScrollView`; `useTurismoPalette` y
  `useTurismoMapPalette` viven en `theme-context.tsx`, y `turismoOpacity` y
  `turismoFixedColors` en `tokens.ts`.
- Mapas: `features/map/data/basemap-style.ts` (estilo autoalojado, paleta y respaldo),
  `use-basemap-style`, `use-map-lifecycle`, `MapLoadingOverlay` y `UserLocationLayers`
  (`features/map/presentation`), compartidos por el mapa de Explorar y el de rutas. Los pines
  del catastro se resuelven con `getEstablishmentPin` (`establishment-pins.ts`).
  `MapAttributionButton` lo dibuja cada mapa (`CenterMap` recibe `attributionInset`);
  `MapCompass` se suscribe al rumbo mediante `createMapBearingStore` para que girar el mapa
  no vuelva a renderizar la pantalla, y `MapActionColumn` apila los controles en huecos fijos.
- Ficha de centro compartida por la sheet de Explorar y `app/centers/[code].tsx`:
  `features/centers/presentation/center-detail/` (`CenterHero` con huecos `leading`/`trailing`,
  `CenterRatingSummary`, `CenterDetailTabs`, `CenterDetailPager`, `CenterInformation`,
  `CenterPhotos` con `expo-image` en caché de disco, `CenterTags` y `useCenterSaveToggle`).
- Explorar: la ruta `app/(tabs)/index.tsx` solo decide la entrada; la pantalla vive en
  `features/explore` (`ExploreMapScreen`, hooks `use-explore-search`, `use-explore-overlay`,
  `use-explore-location-focus` y `use-explore-queries`, y el dominio `explore-overlay.ts`).
  La búsqueda a pantalla completa, sus sugerencias y los chips de modo están en
  `features/search/presentation`.

## Estado

- TanStack Query: estado remoto, cancelación y caché explícita.
- Zustand: sesión, dependencias de UI y estado local de feature.
- Expo SecureStore: refresh token y material sensible mínimo.
- SQLite/AsyncStorage: catálogos descargados y borradores solo cuando se especifique su
  política de retención. Los guardados viven en la cuenta (`favoritos_centros`), no en el
  dispositivo.
- Nunca guardar claves maestras de proveedores.

La app presenta una entrada única de identidad con `Iniciar sesión`, `Crear cuenta` y
`Explorar como invitado`. El menú principal ofrece `Cuenta`: abre la cuenta del turista
autenticado o lleva a la entrada de autenticación cuando no hay sesión. Mapa, fichas
públicas y la vista previa de rutas funcionan como invitado; iniciar navegación, descargar
mapas sin conexión, guardar, abrir Guardados, el agente y futuras opiniones/itinerarios
llevan a la autenticación. El access token vive en memoria y el
refresh token en SecureStore. Una cuenta nueva se crea con rol `TURISTA` mediante
`/auth/mobile/register`; el género es obligatorio y usa las opciones `Masculino` o
`Femenino`, mientras que la fecha de nacimiento se elige con el calendario nativo. Los
guardados se sincronizan con `favoritos_centros`; un favorito no autenticado no se asigna a un `usuario_id` ficticio.
El resumen local de guardados de versiones anteriores se importa una sola vez a la primera
cuenta que inicia sesión en el dispositivo y después se borra, para que otra cuenta no lo
herede; solo se conservan, para reintentar, los lugares que no se pudieron subir por falta
de conexión. La app ya no replica la lista remota en el dispositivo ni la escribe al guardar
o quitar un lugar.

### UI declarativa y overlays

La interfaz sigue el patrón state-driven UI / single source of truth de React Native: lo
visible se deriva del estado y no de efectos implícitos de navegación. Bottom sheets,
fichas y menús transitorios deben cerrarse o desmontarse explícitamente antes de navegar a
otra pantalla, para evitar que una ficha quede montada junto a una ruta activa.

En Explorar, un único estado `ExploreOverlay` decide qué overlay está abierto (ficha de
centro o de establecimiento, opciones superpuestas, enfoque de cámara en curso o agente), de
modo que dos fichas no pueden coexistir. La sheet de resultados es declarativa: se monta
mientras hay una búsqueda enviada y ningún overlay abierto, así que al cerrar una ficha
abierta desde los resultados se vuelve a la lista. Elegir un resultado o una sugerencia
sigue el mismo camino que tocar un pin: centra la cámara y luego abre la ficha.

Las transiciones nativas de Stack y Tabs están desactivadas para evitar el flash blanco que
puede aparecer en `react-native-screens` durante cambios entre navegadores anidados. No se
añaden capas de animación al shell de pantalla. Los overlays que necesiten movimiento usan
Reanimated con tokens compartidos de movimiento y respetan `ReduceMotion.System`; los drawers aprovechan
`ReanimatedDrawerLayout` de Gesture
Handler para mantener panel, scrim y gesto en un único progreso nativo. React Native Paper
conserva las interacciones y animaciones propias de sus controles. La animación no añade
entradas al historial ni sustituye el estado visible declarado por la pantalla.

Las bottom sheets interactivas del mapa usan `@gorhom/bottom-sheet` 5 sobre Gesture Handler
y Reanimated. Se eligió porque su gesto de contenido empieza desde el primer contacto y
coordina el arrastre con sus scrollables; `@expo/ui/community/bottom-sheet` se descartó para
este flujo porque su puente `RNHostView` en Android consumía el primer gesto iniciado sobre
espacio vacío. La dependencia es MIT, se limita a overlays móviles y no define la identidad
visual, que continúa centralizada en los componentes y tokens `Tourism*`.

### Historial de navegación

El stack de Expo Router representa pantallas, no snapshots de la UI. Zoom, paneo, scroll,
filtros, texto y selección local son estado efímero: no crean entradas en el historial ni
se deshacen con el botón Atrás. En Android, cada pantalla enfocada usa un único back
handler que cierra primero sus overlays y después retira exactamente una pantalla; en la
raíz, el evento sale de la aplicación. El mapa es la única pestaña visible del shell
principal; el agente es estado efímero de una sheet y no una pestaña. Las fichas y rutas se
abren con `push` porque sí representan una pantalla que puede cerrarse.

## Caché y funcionamiento sin conexión

TanStack Query persiste el catálogo público en AsyncStorage durante un máximo de 24 horas.
La persistencia usa una lista de claves permitidas (`persistedQueryKeys` en
`src/core/api/query-keys.ts`): centros y fichas publicados, filtros, opiniones públicas y
ciudades offline. Los datos de la cuenta (guardados, opinión propia), las búsquedas y las
consultas por viewport o GPS solo viven en memoria, y al cerrar sesión se eliminan de la
caché todas las claves de `userScopedQueryKeys`. Si la API no responde, la ficha de un
atractivo usa la copia offline solo ante errores de conexión o del servidor; un 404 se
muestra como tal.
El mapa en línea revalida los centros publicados al montar. Los centros confirmados en caché
permanecen visibles mientras se ejecuta una revalidación en segundo plano; una respuesta vacía
los reemplaza al completarse y la caché nunca sustituye la fuente remota PostgreSQL. Los
manifiestos guardados se usan únicamente desde el flujo explícito de mapas sin conexión.

Los paquetes de mapa se descargan por ciudad desde `Mapas sin conexión` y requieren una
sesión turística autenticada. MapLibre `OfflineManager` persiste tiles del estilo de calles
y Expo SQLite conserva el manifiesto, fichas y rutas publicadas. Si la API no está
disponible, el descubrimiento y la ficha básica se hidratan desde ese manifiesto local.
Solo las ciudades con un paquete institucional PUBLICADO aparecen como descargables; sus
límites proceden de una fuente oficial y no se editan en el móvil.

## Ubicación

- Explorar solicita `while in use` al abrirse; el mapa y el resto del catálogo siguen
  disponibles si la persona lo deniega.
- El control “mi ubicación”, la cercanía y el inicio de ruta reutilizan la misma sesión.
  La sesión comprueba que el GPS esté activo, obtiene una lectura fresca con precisión de
  100 m o menos y centra la cámara en un nivel de zoom estable. No usa la última posición
  conocida del sistema como si fuera actual. La posición aceptada se representa con un punto
  azul nativo de MapLibre y la sesión global inicia un watcher foreground de alta precisión
  mientras la app permanece activa. Al quedar centrado, el botón se oculta; si la persona
  mueve el mapa, reaparece para recentrar con zoom 15. Cuando el GPS o el servicio de
  ubicación del dispositivo está apagado muestra una línea gris sobre el icono en vez de un
  aviso flotante.
- Si el permiso ya fue concedido pero el proveedor está apagado, el botón solicita activar
  el servicio con el diálogo del sistema en Android; en iOS dirige a los ajustes de la
  aplicación. Rechazarlo conserva el mapa disponible y muestra el estado correspondiente.
- Mientras la posición está activa, la app sincroniza periódicamente el permiso y el
  estado del proveedor al volver a primer plano y durante la sesión visible. Si el turista
  cambia de pantalla, la sesión no se reinicia; si desactiva la ubicación o el GPS desde
  el sistema, el watcher se detiene, el punto se elimina y la interfaz pasa
  automáticamente al estado correspondiente. Al volver a activar el proveedor, se intenta
  recuperar la posición y reanudar el watcher sin pedir de nuevo el permiso.
- El mapa conserva búsqueda, filtros, fichas y navegación cuando el permiso se deniega,
  el GPS está apagado o la señal no está disponible; el control comunica el estado sin
  bloquear la exploración.
- Solicitar segundo plano solo al activar explícitamente una función que lo requiere y
  explicar el beneficio y ofrecer rechazo. La navegación visible siempre combina el watcher
  de primer plano con una tarea `expo-location` registrada en `expo-task-manager` solo cuando
  se concede el segundo plano; si se rechaza, la ruta sigue funcionando mientras la app está
  visible. El servicio foreground se registra desde la acción de inicio y Android muestra una
  notificación persistente cuando el seguimiento persistente está habilitado. En Android 13 o
  posterior se solicita también `POST_NOTIFICATIONS` para hacer visible esa notificación.
- Persistir únicamente ruta, destino, modo y última posición para que el servicio activo
  conserve continuidad; la posición persistida no se presenta como actual ni se usa para
  recalcular hasta recibir una lectura foreground o background fresca y con precisión de
  100 m o menos. No conservar trazas precisas por defecto.
- Detener seguimiento, eliminar la sesión local y limpiar la tarea y su notificación al
  cancelar/cerrar la ruta con la `X` o al salir de la pantalla antes de iniciar la navegación
  con Atrás. La tarea comprueba también la llegada mientras la app está en segundo plano y
  detiene el seguimiento persistente al alcanzar el destino. Minimizar la aplicación o cambiar
  temporalmente de aplicación no cancela la sesión; desmontar la pantalla por ese cambio de
  estado no debe limpiarla. La
  misma notificación foreground muestra la próxima maniobra y distancia redondeada y se
  actualiza solo cuando cambia ese contenido. Android 13 o posterior puede permitir que el
  usuario la descarte, así que el servicio vuelve a publicar el mismo registro en la siguiente
  actualización de ubicación mientras la navegación siga activa; el Task Manager puede detener
  toda la aplicación. El sistema también puede limitar el segundo plano por batería, permisos
  o políticas del fabricante. El móvil fija `expo-location` 57.0.19 con
  un parche nativo para actualizar las opciones de un servicio foreground ya iniciado cuando
  la actividad está pausada; cualquier actualización futura de Expo debe revisar ese parche.
- Permitir origen manual cuando el permiso se niega.

## Estados obligatorios

Permiso no solicitado, concedido aproximado, concedido preciso, denegado, denegado
permanentemente, GPS apagado, señal degradada y ubicación antigua.

## Captura administrativa

La captura, edición, carga multimedia y publicación de fichas se implementan en el
panel web para administradores. La aplicación móvil no contiene pantallas ni permisos
para esas operaciones.

## Accesibilidad

Soportar escalado de texto, lectores de pantalla, contraste, objetivos táctiles y
subtítulos. No depender solo de color o gestos ocultos.
