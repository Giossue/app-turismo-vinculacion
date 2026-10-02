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
en la vista previa. La sheet del agente ofrece el chat actual; la función de planes
e itinerarios se retiró.
El agente turístico consulta la API autenticada y valida una respuesta estructurada con
texto, tarjetas, acciones propuestas y fuentes. Todas las tarjetas abren una ficha en una
sheet apilada sobre el chat: Atrás o cerrar la ficha devuelve a la misma conversación sin
navegar. Los centros cargan su ficha pública completa; catastro y POI muestran los campos
públicos recibidos, y solo ofrecen ruta si hay coordenadas. Si el texto enumera lugares
que también tienen tarjeta, la lista duplicada se oculta en la vista y en la lectura de
voz; el historial conserva el texto original. Una acción de ruta se
presenta como propuesta y requiere confirmación explícita antes de navegar a `/route`. La
app puede enviar una ubicación puntual redondeada para consultas cercanas, sin historial ni
seguimiento en segundo plano. Como contexto solo se reenvían los intercambios completados
(ni el saludo, ni los errores, ni respuestas cortadas), con los límites del contrato de la
API. La conversación y el borrador permanecen en memoria mientras Explorar esté montado:
cerrar la sheet cancela la respuesta en curso y al reabrirla se pueden continuar los
intercambios completados. El chat permite detener, reintentar el último turno fallido y
comenzar una conversación nueva; el cambio de cuenta borra el estado en memoria. No se
persiste el chat ni la ubicación en el dispositivo. El historial del servidor está
apagado por defecto y conserva sus controles en la API para cuentas con consentimiento
previo. El móvil no ofrece botón, panel ni restauración de historial; solo muestra el chat
actual. Esta retirada visual no elimina registros históricos del servidor.

Las tarjetas del agente validan `travelTimes` cuando aparece: exactamente tres modos
únicos (`car`, `foot`, `bicycle`), con duración y distancia finitas no negativas solo en
estado `available`; `no_route` y `unavailable` no admiten métricas. Las respuestas sin ese
campo siguen siendo compatibles. La lista visual presenta carro, a pie y bici con iconos
`TurismoIcon`, sin reordenar las tarjetas, y usa el formato compartido
`formatDurationSeconds` (cero válido equivale a «<1 min»). Los estados restantes se muestran
como «Sin ruta» o «No disponible», y la leyenda indica «Tiempos estimados desde tu
ubicación aproximada». La etiqueta accesible del botón de la tarjeta incluye toda la lista
para evitar controles accesibles anidados. El móvil no calcula minutos ni envía solicitudes
directas al proveedor vial. Consultar tiempos no inicia navegación.

Cada chat admite veinte mensajes del usuario, incluidos los que tienen respuesta fallida
o detenida. El contador se deriva de las burbujas del usuario, con una validación antes
de cada envío sobre el estado actual en memoria. Al alcanzar veinte, texto y voz quedan
bloqueados para preguntas nuevas y se muestra «Nuevo chat». Reintentos y repeticiones con
GPS conservan los IDs del turno y reemplazan su respuesta, incluso si hay mensajes
posteriores; no consumen otro mensaje ni eliminan esos mensajes posteriores. El contexto
para repetir ese turno contiene solo los intercambios completados que lo preceden.
El límite se conserva al cerrar/reabrir la hoja y se reinicia al comenzar un chat nuevo
o cambiar de cuenta. Es una regla del chat móvil; el contexto del modelo mantiene su
límite independiente de doce entradas.
El encabezado usa `TourismSheetHandle` con la acción de nuevo chat a la izquierda
y el cierre a la derecha, en una sola fila. El contador se alinea a la derecha
encima del compositor y se desplaza con él al abrir el teclado.

`expo-audio` graba hasta 30 segundos tras el permiso del sistema;
la transcripción vuelve al borrador editable. El compositor muestra un botón «+»
que abre Voz; durante una grabación permite detener y transcribir o cancelar.
El agente no abre cámara o galería ni envía imágenes. `expo-file-system` comprueba
el tamaño del audio y borra los archivos temporales cuando corresponde. La voz de
salida usa `expo-speech` sobre el texto visible; el usuario puede detenerla. Estas
dependencias están alineadas con SDK 57 y tienen licencia MIT. Su superficie
adicional es el permiso de micrófono, archivos temporales y el envío explícito de
audio a la API. La build nativa debe regenerarse para retirar el plugin y los
permisos de cámara/galería que antes usaba el agente. La lectura
de voz de cada respuesta se controla con un icono discreto en la esquina de su
mensaje y mantiene un objetivo táctil de 44 dp.

La preferencia de apariencia se administra desde `Menú > Configuración`, con una sola fila
«Usar tema oscuro» y un interruptor: activado elige `dark` y desactivado elige `light`.
El interruptor refleja el esquema efectivo, incluso si una preferencia `system` previa o
inicial sigue la apariencia del dispositivo hasta la primera elección manual. El proveedor
de tema mantiene una única fuente de verdad (`system`, `light` o `dark`), la persiste en
AsyncStorage dentro de `setPreference` (una elección hecha mientras se lee el valor guardado
prevalece sobre él) y expone el esquema efectivo a los tokens, Paper, MapLibre y la barra
de estado. `TurismoSchemeScope` fija el esquema de un subárbol
—la entrada de cuenta siempre es oscura— sin cambiar la preferencia. El cambio no crea una
ruta adicional ni altera el historial de navegación.

## Compatibilidad y referencias de plataforma

El cliente se mantiene alineado con Expo SDK `~57.0.24`, Expo Router `~57.0.22`, React
Native `0.86.3` y React `19.2.3`. Las dependencias Expo se instalan con
`corepack pnpm expo install` para conservar las versiones compatibles del SDK. Los cambios
de configuración nativa y permisos requieren regenerar/reconstruir el binario; no se
consideran aplicados por Fast Refresh.

Para desarrollar en un Android físico conectado por USB, instalar una vez la variante
`development` con `corepack pnpm --filter @turismo/mobile run dev:android`. Esta variante
usa el paquete `ec.edu.ueb.turismovinculacion.software.dev` y aparece como
`Turismo Vinculación Dev`, de modo que convive con la app publicada. En sesiones posteriores,
arrancar Metro con `corepack pnpm --filter @turismo/mobile run dev:metro` y abrir
`Turismo Vinculación Dev` en el teléfono. Si se usa USB, `adb reverse tcp:8081 tcp:8081`
permite llegar al servidor local. Los cambios de JavaScript se sirven desde Metro; los
cambios nativos exigen reconstruir la variante. Si se alterna una compilación nativa de
producción y desarrollo en el mismo checkout, regenerar el proyecto nativo para que el
identificador coincida con la variante seleccionada.

React Native Paper es el único kit externo de componentes del móvil. Los componentes
`Tourism*` exponen la identidad del producto y los tokens Turismo son su fuente visual;
`StyleSheet` se usa para layout nativo. NativeWind/Tailwind no forman parte de este cliente;
la web se desarrollará en un repositorio separado.

Las pantallas secundarias usan `TourismScreenFrame` como shell compartido. Este componente
centraliza safe areas, encabezado, ancho máximo de contenido y márgenes horizontales. Las
pantallas principales viven en un `Tabs` de Expo Router con una barra inferior propia
(`TourismTabBar`): `Explorar` (mapa), `Guardados` (`src/app/(tabs)/saved.tsx`) y `Menú`,
que no es una pantalla sino la acción que abre la hoja de menú. Las pestañas se cambian con
`replace`; sin sesión, `Guardados` pasa por el login y vuelve a la pestaña. El mapa ocupa
todo el espacio sobre la barra y sus acciones efímeras no crean entradas de navegación. `Cómo llegar` (`src/app/route.tsx`) es
la otra excepción de mapa a pantalla completa: MapLibre ocupa toda la pantalla y el panel de
vista previa o el modo de navegación activa se dibujan encima con los mismos tokens y
controles `Tourism*`; la atribución del mapa se desplaza por encima de ellos. Si el enlace no
trae un destino válido, la ruta sí usa `TourismScreenFrame` con `Volver` y un estado de
error. El chat del agente se monta dentro de
una sheet nativa de altura completa sobre el mapa; no se cierra por gesto y muestra una `X`
en el encabezado. El compositor usa el manejo nativo de teclado y permanece sobre el área
visible cuando aparece el teclado del sistema.

El campo del agente crece según el contenido con un límite que depende de la ventana
y el teclado, respetando la fuente del sistema. Android mantiene la edición dentro
de la app incluso en horizontal. Mientras se escribe en horizontal, el encabezado
del chat y el contador se ocultan temporalmente para reservar espacio al campo y al
envío; vuelven al cerrar el teclado. Las etiquetas de `TourismTabs` y de la barra
inferior permiten varias líneas; el espacio reservado para la barra utiliza su
altura medida. En la ruta expandida, título y destino forman parte del scroll; en
compacto el contenido se desplaza cuando excede la altura disponible. En ese caso
la expansión sigue disponible al tocar el asa y el cuerpo reserva el gesto para
scroll. Con fuente ampliada la acción muestra «Navegar» y conserva la etiqueta
accesible completa «Iniciar navegación».

La hoja de menú se abre desde la pestaña `Menú` de la barra inferior. Un
`TourismMenuProvider` posee una única hoja para el shell principal: sube desde abajo con
superficie sólida, `TourismSheetHandle`, una cabecera de perfil (`TourismMenuProfile`: avatar
con iniciales, nombre y correo, que solo informa, o «Invitado» sin sesión, que lleva al login) y las entradas;
«Cerrar sesión» cierra el grupo final solo con sesión iniciada. Las pantallas
secundarias (ficha, ruta, mapas sin conexión y configuración) no muestran la barra:
su encabezado ofrece `Volver`.

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
- Controles y formularios (`src/core/ui`): `TourismPressable` (ripple de Android y opacidad
  al presionar en iOS, atenuado si está deshabilitado) reemplaza a los `Pressable` crudos;
  `TourismTextField` (etiqueta, `helper`, `error` anunciado, `secure` con mostrar/ocultar,
  `multiline` y `ref` para encadenar el foco), `TourismRadioGroup` (`radiogroup` de opciones
  `radio` con estado `checked`, en fila o en columna), `TourismDateField` (calendario nativo
  con límites; en iOS un modal con cierre de 44dp) y `TourismSnackbar` (aviso breve de Paper
  en un portal). `TourismActionButton` admite `loading`, `size="lg"`, `trailingIcon`,
  `accessibilityLabel` y `mode="ghost"` para enlaces; la hoja de menú recibe sus entradas como
  `items` (`TourismMenuItem`) y su cabecera como `profile` (`TourismMenuProfile`).
- Cuenta (`features/auth`): `loginFormSchema`/`registrationFormSchema` (zod, con los límites
  de los DTO de la API y el recorte de espacios en un único lugar) y `useAuthForm`; las
  pantallas protegidas usan `AuthGate` (o `useRequireAuth`), que muestra la carga mientras
  se restaura la sesión y redirige de forma declarativa a `buildLoginHref(returnTo)`.
  `features/favorites/presentation/SavedCenterErrorSnackbar` informa de un guardado fallido.
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
  La lista en vivo bajo el buscador y sus filtros de tipo y alcance están en
  `features/search/presentation`; `use-public-search` y `use-debounced-search-text`
  coordinan consulta/cancelación y espera de escritura. `search-relevance` y
  `offline-search` reúnen y ordenan coincidencias públicas y descargadas.

## Estado

- TanStack Query: estado remoto, cancelación y caché explícita.
- Zustand: sesión, dependencias de UI y estado local de feature.
- Expo SecureStore: refresh token y material sensible mínimo (el perfil público de la
  sesión —id, nombre, correo y roles— para restaurarla sin conexión).
- SQLite/AsyncStorage: catálogos descargados y borradores solo cuando se especifique su
  política de retención. Los guardados viven en la cuenta (`favoritos_centros`), no en el
  dispositivo.
- Nunca guardar claves maestras de proveedores.

La app presenta una entrada única de identidad con `Iniciar sesión`, `Crear cuenta` y
`Explorar como invitado`. No hay pantalla de cuenta: la cabecera de la hoja de menú muestra
nombre y correo del turista autenticado (con «Cerrar sesión» al final) o, sin sesión, lleva a
la entrada de autenticación. Mapa, fichas
públicas y la vista previa de rutas funcionan como invitado; iniciar navegación, descargar
mapas sin conexión, guardar, abrir Guardados, el agente y futuras opiniones
llevan a la autenticación. El access token vive en memoria y el
refresh token en SecureStore. `request` solo adjunta el token a URL de la API configurada.
Si la renovación falla por red o por un error 5xx, la sesión guardada se conserva: con el
perfil guardado la app sigue autenticada sin access token y la siguiente solicitud
autenticada vuelve a renovarla; solo una negativa de la API (400, 401 o 403) la borra.
Cerrar sesión es de mejor esfuerzo: intenta revocar el token y, aunque falle sin conexión,
borra la sesión local; la pantalla protegida redirige una sola vez a la entrada de cuenta.
Tras iniciar sesión, la entrada vuelve a `returnTo` con `router.dismissTo`, que retira la
entrada si el destino ya está debajo (sin duplicar pantallas) o la reemplaza; `/route`
vuelve con `back()` para conservar su destino. Los errores de cada formulario viven en el
propio formulario. Una cuenta nueva se crea con rol `TURISTA` mediante
`/auth/mobile/register`; el género es obligatorio y usa las opciones `Masculino` o
`Femenino`, mientras que la fecha de nacimiento se elige con el calendario nativo. Los
guardados se sincronizan con `favoritos_centros`; un favorito no autenticado no se asigna a un `usuario_id` ficticio.
El resumen local de guardados de versiones anteriores se importa una sola vez a la primera
cuenta que inicia sesión en el dispositivo y después se borra, para que otra cuenta no lo
herede; solo se conservan, para reintentar, los lugares que no se pudieron subir por falta
de conexión. La app no escribe un resumen local propio al guardar o quitar un lugar: la
lista de la cuenta solo se conserva como consulta persistida de TanStack Query (ver
«Caché y funcionamiento sin conexión»). Si guardar o quitar falla, el marcador vuelve a su
estado anterior y un `TourismSnackbar` lo explica. La mutación recibe `currentlySaved`
(el estado antes del toque; `saved` queda como alias obsoleto).

### UI declarativa y overlays

La interfaz sigue el patrón state-driven UI / single source of truth de React Native: lo
visible se deriva del estado y no de efectos implícitos de navegación. Bottom sheets,
fichas y menús transitorios deben cerrarse o desmontarse explícitamente antes de navegar a
otra pantalla, para evitar que una ficha quede montada junto a una ruta activa.

En Explorar, un único estado `ExploreOverlay` decide qué overlay está abierto (ficha de
centro o de establecimiento, opciones superpuestas, enfoque de cámara en curso o agente), de
modo que dos fichas no pueden coexistir. Buscar actualiza una lista debajo del campo en
la misma interfaz de búsqueda; no monta una sheet de resultados al escribir o enviar.
Elegir un centro o establecimiento sigue el mismo camino que tocar un pin: cierra la
interfaz transitoria de búsqueda, abre la ficha y, a la vez, centra la cámara. Elegir una
referencia geográfica cierra esa interfaz y centra el mapa. Una coincidencia descargada
cierra la búsqueda antes de navegar al visor local de su ciudad.

Las transiciones de pantalla usan movimiento en ambas plataformas: el Stack usa
`animation: "slide_from_right"` (en iOS también se vuelve deslizando desde el borde) y las
pestañas se desplazan de lado el ancho completo, sin fundido (`animation: "shift"` con un
`sceneStyleInterpolator` que solo traslada). Para evitar el flash blanco
que `react-native-screens` puede mostrar entre navegadores anidados, el Stack pinta el fondo
del tema en `contentStyle` y las pestañas en `sceneStyle`. No se añaden capas de animación
propias al shell de pantalla. Los overlays que necesiten movimiento usan
Reanimated con tokens compartidos de movimiento y respetan `ReduceMotion.System`; la hoja de menú mantiene panel, scrim y
gesto de arrastre (Gesture Handler) sobre valores compartidos de Reanimated. React Native Paper
conserva las interacciones y animaciones propias de sus controles. La animación no añade
entradas al historial ni sustituye el estado visible declarado por la pantalla.

Los chips sobre el mapa de Explorar (`ExploreFilterChips`) filtran lo que se dibuja:
"Turismo" (solo atractivos) y los grupos principales del catastro (Restaurantes, Cafeterías,
Alojamiento, Bares), con ícono monocromo; "Ver más" abre una sheet con el resto de grupos. Sin
chip seleccionado se ve todo y tocar el chip activo lo quita. Los grupos se definen en
`features/establishments/domain/establishment-groups.ts` con las mismas claves que la
propiedad `group` de cada punto de las teselas `GET /establishments/tiles/:z/:x/:y`
(`apps/api/src/establishments/establishment-groups.ts`), que la API deriva de la actividad o
el tipo del catálogo del catastro. El chip filtra la capa en MapLibre, sin pedir otra vez las
teselas.

En Explorar las fichas comparten una única sheet siempre montada y cerrada
(`TourismBottomSheetHost`, `index: -1`): cada `TourismBottomSheet` le entrega su contenido y
el host la abre con `snapToIndex`, porque montar una `BottomSheet` nueva en cada apertura
obliga a calcular su layout antes de animarla (`animateOnMount`). Abren y cierran con una
animación de 250 ms (`useBottomSheetTimingConfigs`).
Su fondo usa la superficie sólida del tema con opacidad completa tanto a media altura como
al expandirse; el mapa y los controles no se transparentan a través de la ficha.

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
abren con `push` porque sí representan una pantalla que puede cerrarse. Las pantallas
secundarias sin overlays (guardados, configuración) no registran back handler: el
stack retira una pantalla. En la entrada de cuenta, Atrás cierra primero el formulario
abierto. La hoja de menú vive en un `Modal` visible mientras el menú está abierto; la
hoja es fija (sin arrastre; el scrim no la cierra, y su asa no lleva barra) y cualquier
cierre (X, entrada, perfil sin sesión o Atrás) anima la hoja y solo al
terminar oculta el modal y ejecuta la acción elegida.

## Búsqueda en vivo

Un solo campo ofrece «Todo», «Atractivos», «Servicios» y «Lugares». Desde dos caracteres
se actualizan las coincidencias; las peticiones a `GET /api/v1/search` usan debounce de
300 ms y cancelación de TanStack Query. Los cambios de texto, tipo y alcance forman parte
de la clave de consulta para que una respuesta anterior no sustituya la lista actual.
Las coincidencias locales leen manifiestos guardados y no hacen peticiones a la API.
El filtro «Lugares» reúne referencias geográficas remotas y, en los paquetes descargados,
POIs y recorridos publicados; «Atractivos» limita a centros y «Servicios» al catastro.

«Todo Ecuador» es el alcance inicial. «En esta zona» envía el bbox completo de la zona
visible. `CenterMap` publica `CenterMapViewport` una vez al estar listo y al finalizar cada
movimiento, utilizando `getViewState` inicial y `onRegionDidChange` de MapLibre v11. Valida
centro/bounds, deduplica el ruido de precisión e invalida lecturas iniciales asíncronas
cuando comienza otro movimiento o se desmonta. No calcula el área desde un centro
supuesto ni consulta bounds por frame. Sin viewport válido se espera antes de buscar
en la zona; el placeholder web no fabrica uno.

La relevancia textual prioriza nombre exacto, prefijo y contenido sobre otros campos
públicos. La normalización elimina diferencias de tildes y mayúsculas, aplica grupos
definidos de sinónimos y admite errores pequeños; los alias de consulta no reemplazan
la clasificación administrable. La distancia directa solo desempata la relevancia con
una coordenada ya disponible o el centro del mapa, únicamente para ordenar. Las filas
muestran tipo, nombre, descripción/localidad y, cuando corresponde, «Mapa descargado»;
no muestran metros, minutos ni «cerca de ti». No calcula rutas ni solicita GPS como
consecuencia de escribir, cambiar tipo o seleccionar alcance.

La lista reúne y deduplica resultados remotos y datos de los mapas descargados. Ante
error remoto o consultas pausadas por falta de red conserva solo las coincidencias locales
y comunica la cobertura disponible por ciudad, limitada por la zona elegida cuando
corresponde. «Todo Ecuador» no significa cobertura nacional sin conexión. Una coincidencia
local navega a `/offline-city` con su ciudad y elemento para abrirlo sin una solicitud de
ficha. No proporciona geocodificación offline general de calles ni paquetes provinciales.

## Caché y funcionamiento sin conexión

TanStack Query persiste en AsyncStorage durante un máximo de 24 horas
(`src/core/api/query-persistence.ts`) una lista de claves permitidas (`persistedQueryKeys`
en `src/core/api/query-keys.ts`): centros y fichas publicados, filtros, opiniones públicas
(paginadas, 20 por página con `Cargar más`), ciudades offline y los guardados de la cuenta,
para que `Guardados` abra sin conexión; tras 5 minutos la lista se revalida y, si falla, se
sigue mostrando la copia. La opinión propia, las búsquedas y las consultas por viewport o GPS
solo viven en memoria. Al cerrar sesión se eliminan de la caché todas las claves de
`userScopedQueryKeys` y se borra de inmediato la copia persistida, que se reescribe con el
siguiente cambio sin los datos de la cuenta. Si la API no responde, la ficha de un
atractivo usa la copia offline solo ante errores de conexión o del servidor; un 404 se
muestra como tal.
El mapa en línea revalida los centros publicados al montar. Los centros confirmados en caché
permanecen visibles mientras se ejecuta una revalidación en segundo plano; una respuesta vacía
los reemplaza al completarse y la caché nunca sustituye la fuente remota PostgreSQL. Los
manifiestos guardados no sustituyen la capa remota de centros de Explorar. También
aportan coincidencias identificadas a la búsqueda; seleccionarlas abre el visor explícito
de mapas sin conexión.

Los paquetes de mapa se descargan por ciudad desde `Mapas sin conexión` y requieren una
sesión turística autenticada. MapLibre `OfflineManager` persiste los recursos del estilo
HTTP/S `/offline/map-style` y Expo SQLite conserva el manifiesto con estilos claro/oscuro,
centros, POIs propios públicos, catastros publicados y recorridos de transporte. El visor
`/offline-city?slug=…` consulta SQLite con `networkMode: always`, busca y abre fichas
localmente y monta fuentes GeoJSON en vez de la capa MVT remota. No mezcla datos locales
con la capa de centros de Explorar en línea. La búsqueda de Explorar puede leer esos
manifiestos y conducir al mismo visor local. El catálogo descargado abre aun sin catálogo remoto.

Solo las ciudades con un paquete institucional PUBLICADO son descargables. Sus límites
oficiales tienen prioridad; sin ellos, una caja acotada alrededor de sus coordenadas define
la cobertura. Sin ninguna de esas referencias la descarga falla. Actualizar crea un paquete
nuevo, guarda su manifiesto y después borra los anteriores: una descarga fallida conserva
la anterior. Descarga y borrado se excluyen mutuamente; salir de la pantalla no cancela una
descarga. Borrar elimina los recursos nativos y el manifiesto de esa ciudad. El tamaño mostrado
son bytes de recursos cartográficos, no el espacio exacto total del teléfono.

La descarga es de mapas de zonas con sus recorridos publicados incluidos. «Cómo llegar»
no ofrece guardar rutas calculadas y «Mapas sin conexión» no las lista por separado.
El panel conserva el destino, las pestañas de modo, duración/distancia, indicaciones y
navegación; no repite el modo como título ni muestra «Ruta más rápida».
La lectura de rutas antiguas por enlace se conserva por compatibilidad sin crear rutas
nuevas ni borrar datos existentes. Una navegación online conserva su trazo y permite
reintento manual cuando falla un recálculo. Los recorridos institucionales se muestran
desde el mapa descargado sin fabricar navegación giro a giro. Actualmente los paquetes
son de ciudad; la cobertura por provincia requiere límites y publicación propios.
Véase `product/features/offline-maps/`.

## Ubicación

- Explorar no solicita la ubicación al abrirse: `while in use` se pide solo cuando la
  persona toca "mi ubicación" o activa una función de ruta que la necesita. Buscar
  servicios o filtrar por la zona visible no pide ese permiso. El mapa y el
  resto del catálogo siguen disponibles si la deniega.
- El control “mi ubicación”, la cercanía y el inicio de ruta reutilizan la misma sesión.
  Si el agente recibe una pregunta cercana o por tiempo para llegar y el permiso ya está concedido, obtiene
  una lectura GPS aunque Explorar todavía no haya centrado el mapa. Si no consigue
  una coordenada, muestra la acción «Usar mi ubicación» y al tocarla solicita la
  lectura o el permiso y repite la consulta. Las preguntas generales no piden GPS.
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
  explicar el beneficio junto al interruptor de la vista previa, apagado por defecto. El
  botón «Iniciar navegación» comienza sin diálogo propio y usa el watcher de primer plano.
  Solo si la persona activa «Seguir al salir de la app» y concede los permisos del sistema
  se registra una tarea `expo-location` en `expo-task-manager`; rechazar el permiso deja el
  interruptor apagado y no comienza la ruta. El servicio foreground se registra al activar
  la navegación con esa opción, después de guardar la sesión, y Android muestra una
  notificación persistente cuando el seguimiento persistente está habilitado. Si la tarea no
  puede iniciarse, el watcher de primer plano continúa y la pantalla avisa que la ruta sigue
  solo con la app abierta. En Android 13 o posterior se solicita también
  `POST_NOTIFICATIONS` para hacer visible esa notificación.
- Al activar el seguimiento en segundo plano, persistir únicamente ruta, destino, modo y última posición para que el servicio activo
  conserve continuidad; la posición persistida no se presenta como actual ni se usa para
  recalcular hasta recibir una lectura foreground o background fresca y con precisión de
  100 m o menos. No conservar trazas precisas por defecto. Ruta, destino y modo se escriben
  al iniciar y al recalcular; la última posición y la última notificación publicada viven en
  un registro pequeño aparte que la tarea reescribe en cada lectura, sin reescribir la ruta.
  Las escrituras nunca rechazan: un fallo se informa como resultado y no bloquea la cola.
  En navegación solo en primer plano no se crea esa sesión persistente.
- `useNavigationSession` es el único dueño del ciclo de vida de la navegación; la pantalla de
  ruta solo cambia `navigationActive`. Al cerrar con la `X` o al perder el foco —Expo Router
  emite `blur` cuando otra pantalla cubre la ruta— pasa a `false` y la sesión detiene el
  watcher, la tarea y su notificación, elimina la sesión local, silencia la voz y reinicia su
  estado. La pantalla escucha `blur` en vez de la limpieza de `useFocusEffect`, que también
  corre al desmontar: un desmontaje sin `blur` (Android puede destruir la actividad mientras
  la app está oculta) no cambia nada, porque minimizar o cambiar temporalmente de aplicación
  no cancela la sesión. Antes de iniciar no hay seguimiento que limpiar. Si la app vuelve a
  primer plano sin una pantalla de ruta montada que posea la navegación, la tarea la termina
  para no dejar una notificación imposible de cerrar. La tarea comprueba también la llegada
  mientras la app está en segundo plano y detiene el seguimiento persistente al alcanzar el
  destino; un error transitorio al leer la sesión no la detiene. La
  misma notificación foreground muestra la próxima maniobra y distancia redondeada; solo la
  tarea la actualiza y únicamente cuando cambia ese contenido. Android 13 o posterior puede permitir que el
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
