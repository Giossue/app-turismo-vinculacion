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
    navigation/ transport/ favorites/ itineraries/ ai/
    field_capture/ profile/
```

Cada feature separa `domain`, `application`, `data` y `presentation` cuando la complejidad
lo amerita. Evitar capas ceremoniales para componentes triviales.

La navegación turística está organizada alrededor del mapa: `Explorar` muestra MapLibre y
una ficha rápida nativa; `Agente` se presenta como una conversación tipo chat con el
compositor fijo al pie; `Itinerario` es una vista secundaria con la misma barra inferior;
`Cómo llegar` representa la ruta activa sin solicitar GPS en la vista previa.
Los datos de ejemplo se identifican visualmente como demostración y se sustituyen por
consultas de la API cuando esos módulos se conecten.

La preferencia de apariencia se administra desde `Menú > Configuración`. El proveedor de
tema mantiene una única fuente de verdad (`system`, `light` o `dark`), la persiste en
AsyncStorage y expone el esquema efectivo a los tokens, Paper, MapLibre y la barra de estado.
El cambio no crea una ruta adicional ni altera el historial de navegación.

## Compatibilidad y referencias de plataforma

El cliente se mantiene alineado con Expo SDK `~57.0.23`, Expo Router `~57.0.21`, React
Native `0.86.3` y React `19.2.3`. Las dependencias Expo se instalan con
`corepack pnpm expo install` para conservar las versiones compatibles del SDK. Los cambios
de configuración nativa y permisos requieren regenerar/reconstruir el binario; no se
consideran aplicados por Fast Refresh.

React Native Paper es el único kit externo de componentes del móvil. Los componentes
`Tourism*` exponen la identidad del producto y los tokens Turismo son su fuente visual;
`StyleSheet` se usa para layout nativo. NativeWind/Tailwind no forman parte de este cliente;
la web se desarrollará en un repositorio separado.

Las pantallas secundarias usan `TourismScreenFrame` como shell compartido. Este componente
centraliza safe areas, encabezado, ancho máximo de contenido y márgenes horizontales. Las
vistas principales viven en un `Tabs` real de Expo Router con `detachInactiveScreens={false}`:
la barra inferior visual (`TourismTabBar`) se inyecta como `tabBar` personalizado y el mapa
queda montado al cambiar a Agente o Itinerario.

El acceso al menú lateral se presenta como el cuarto elemento de `TourismTabBar` en las
vistas principales (`Explorar`, `Agente` e `Itinerario`). Un `TourismMenuProvider` posee un
único drawer para esas pestañas; las pantallas secundarias que no montan esa barra conservan
el mismo botón en el encabezado con un drawer local.

Las decisiones de layout siguen las primitivas oficiales de React Native: dimensiones en
puntos independientes de densidad, Flexbox y `useWindowDimensions` para adaptación,
`fontScale` para texto ampliado, `StyleSheet`/tokens para estilos previsibles, componentes
tipográficos compartidos por la herencia limitada de `Text`, objetivos táctiles de 44dp o
mayores y accesibilidad explícita en controles no textuales. `PixelRatio` se reserva para
integraciones que necesiten densidad real. El back handler se registra y
limpia por pantalla, consume primero overlays y no convierte gestos efímeros en historial.

Referencias: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [Expo Location](https://docs.expo.dev/versions/v57.0.0/sdk/location/), [Expo TaskManager](https://docs.expo.dev/versions/v57.0.0/sdk/task-manager/), [Expo Speech](https://docs.expo.dev/versions/latest/sdk/speech/), [Expo Router](https://docs.expo.dev/router/introduction/), [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/), [MapLibre OfflineManager](https://maplibre.org/maplibre-react-native/docs/modules/offline-manager/), [Style RN 0.86](https://reactnative.dev/docs/0.86/style), [dimensiones](https://reactnative.dev/docs/0.86/height-and-width), [useWindowDimensions](https://reactnative.dev/docs/0.86/usewindowdimensions), [PixelRatio](https://reactnative.dev/docs/0.86/pixelratio), [Text](https://reactnative.dev/docs/0.86/text), [Pressable](https://reactnative.dev/docs/0.86/pressable), [BackHandler](https://reactnative.dev/docs/0.86/backhandler) y [accesibilidad](https://reactnative.dev/docs/0.86/accessibility).

## Estado

- TanStack Query: estado remoto, cancelación y caché explícita.
- Zustand: sesión, dependencias de UI y estado local de feature.
- Expo SecureStore: refresh token y material sensible mínimo.
- SQLite/AsyncStorage: catálogos descargados, favoritos sincronizables y borradores solo
  cuando se especifique su política de retención.
- Nunca guardar claves maestras de proveedores.

### UI declarativa y overlays

La interfaz sigue el patrón state-driven UI / single source of truth de React Native: lo
visible se deriva del estado y no de efectos implícitos de navegación. Bottom sheets,
fichas y menús transitorios deben cerrarse o desmontarse explícitamente antes de navegar a
otra pantalla, para evitar que una ficha quede montada junto a una ruta activa.

Las transiciones nativas de Stack y Tabs están desactivadas para evitar el flash blanco que
puede aparecer en `react-native-screens` durante cambios entre navegadores anidados. No se
añaden capas de animación al shell de pantalla. Los overlays que necesiten movimiento usan
Reanimated con tokens compartidos de movimiento y respetan `ReduceMotion.System`; los drawers aprovechan
`ReanimatedDrawerLayout` de Gesture
Handler para mantener panel, scrim y gesto en un único progreso nativo. React Native Paper
conserva las interacciones y animaciones propias de sus controles. La animación no añade
entradas al historial ni sustituye el estado visible declarado por la pantalla.

### Historial de navegación

El stack de Expo Router representa pantallas, no snapshots de la UI. Zoom, paneo, scroll,
filtros, texto y selección local son estado efímero: no crean entradas en el historial ni
se deshacen con el botón Atrás. En Android, cada pantalla enfocada usa un único back
handler que cierra primero sus overlays y después retira exactamente una pantalla; en la
raíz, el evento sale de la aplicación. Las pestañas (`Explorar`, `Agente` e `Itinerario`)
se cambian con el router nativo de Tabs, que conserva una instancia por pestaña y no apila
copias de la misma navegación. Las fichas y rutas se abren con `push` porque sí representan
una pantalla que puede cerrarse.

## Caché y funcionamiento sin conexión

TanStack Query persiste el catálogo público en AsyncStorage durante un máximo de 24 horas.
El mapa en línea revalida los centros publicados al montar y solo dibuja los pines después de
una respuesta exitosa de la API. Una respuesta vacía no se completa con datos persistidos y
los datos anteriores se ocultan mientras la consulta está pendiente; así la caché no sustituye
la fuente remota PostgreSQL. Los manifiestos guardados se usan únicamente desde el flujo
explícito de mapas sin conexión.

Los paquetes de mapa se descargan por ciudad desde `Mapas sin conexión`. MapLibre
`OfflineManager` persiste tiles del estilo de calles y Expo SQLite conserva el manifiesto,
fichas y rutas publicadas. Si la API no está disponible, el descubrimiento y la ficha básica
se hidratan desde ese manifiesto local. Solo las ciudades con un paquete institucional
PUBLICADO aparecen como descargables; sus límites proceden de una fuente oficial y no se
editan en el móvil.

## Ubicación

- Explorar no requiere GPS.
- Solicitar `while in use` al pulsar “mi ubicación”, cercanía o iniciar ruta.
- El control “mi ubicación” solicita el permiso de primer plano de forma explícita,
  comprueba que el GPS esté activo, aprovecha una posición reciente y centra la cámara
  en un nivel de zoom estable. La posición se representa con un punto azul nativo de
  MapLibre y no se sigue automáticamente después del centrado.
- Si el permiso ya fue concedido pero el proveedor está apagado, el botón solicita activar
  el servicio con el diálogo del sistema en Android; en iOS dirige a los ajustes de la
  aplicación. Rechazarlo conserva el mapa disponible y muestra el estado correspondiente.
- Mientras la posición está activa, la app sincroniza periódicamente el permiso y el
  estado del proveedor al volver a primer plano y durante la sesión visible. Si el turista
  desactiva la ubicación o el GPS desde el sistema, el punto se elimina y la interfaz pasa
  automáticamente al estado correspondiente.
- El mapa conserva búsqueda, filtros, fichas y navegación cuando el permiso se deniega,
  el GPS está apagado o la señal no está disponible; el control comunica el estado sin
  bloquear la exploración.
- Solicitar segundo plano solo al activar navegación y explicar el beneficio. La navegación
  visible combina el watcher de primer plano con una tarea `expo-location` registrada en
  `expo-task-manager`; el servicio foreground se registra desde la acción de inicio y Android
  muestra una notificación persistente mientras la sesión está activa. En Android 13 o
  posterior se solicita también `POST_NOTIFICATIONS` para hacer visible esa notificación.
- Persistir únicamente ruta, destino, modo y última posición para restaurar el estado al
  volver a la app; no conservar trazas precisas por defecto.
- Detener seguimiento, eliminar la sesión local y limpiar la tarea y su notificación al
  terminar/cancelar la ruta. La tarea comprueba también la llegada mientras la app está en
  segundo plano. Desmontar la pantalla al pasar a segundo plano no cancela la sesión. La
  misma notificación foreground muestra la próxima maniobra y distancia redondeada y se
  actualiza solo cuando cambia ese contenido. Android 13 o posterior puede permitir que el
  usuario la descarte, así que el servicio vuelve a publicar el mismo registro en la siguiente
  actualización de ubicación mientras la navegación siga activa; el Task Manager puede detener
  toda la aplicación. El sistema también puede limitar el segundo plano por batería, permisos
  o políticas del fabricante. El móvil fija `expo-location` 57.0.18 con
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
