# Mapas, rutas y navegación

## Responsabilidades

### MapLibre

- Renderizado nativo de mapas base, capas y marcadores en Android/iOS.
- Estilos de mapa y tiles configurados por entorno; el estilo de demostración nunca se usa
  en producción.
- El mapa móvil usa el estilo configurado en `EXPO_PUBLIC_TILESERVER_STYLE_URL`, servido
  por el TileServer GL propio y respaldado por los tiles
  vectoriales OpenMapTiles generados desde OpenStreetMap para Ecuador. La app descarga el
  JSON del estilo, conserva la referencia TileJSON publicada por TileServer GL y aplica una
  paleta propia para terreno, edificios, agua, zonas verdes y calles. Si el servidor no responde, conserva
  los pines sobre un fondo local neutro; no cambia a ArcGIS o Stadia.
- No calcula rutas ni provee navegación por sí mismo.

### Proveedor de rutas

- Geocodificación, cálculo de ruta, instrucciones, recálculo y mapas offline si se aprueba.
- Se consume desde el backend mediante un puerto para preservar la posibilidad de cambiar
  proveedor y proteger credenciales de servicios privilegiados.
- Las rutas calculadas online se exponen mediante `POST /api/v1/routing/route`, que recibe
  origen, destino y `mode` (`car`, `bicycle` o `foot`) y devuelve distancia, duración,
  geometría GeoJSON e indicaciones.
- En producción, el adaptador usa los servicios privados `osrm-car`, `osrm-bicycle` y
  `osrm-foot` dentro de `dokploy-network`. El móvil nunca conoce sus nombres ni sus puertos.

### PostgreSQL/PostGIS

- Centros, POI, establecimientos y paradas oficiales.
- Consultas por viewport, distancia y territorio.
- Geometría declarada de rutas de cooperativas.
- Relación entre rutas, centros y paradas.
- Si una ruta publicada no tiene `duracion_estimada`, la API estima sus minutos con la
  longitud PostGIS y una velocidad media conservadora por tipo de transporte, sin tráfico.
  La duración declarada por la administración siempre tiene prioridad y la respuesta
  marca el valor estimado.

No duplicar automáticamente toda la base en un proveedor cartográfico. Publicar capas
externas solo cuando exista un workflow GIS que lo necesite.

## Tipos de ruta

- Ruta calculada: resultado temporal del proveedor de rutas para un origen/destino y modo.
- Ruta registrada: recorrido institucional de una cooperativa con paradas y horarios.
- Itinerario: secuencia turística de visitas; puede requerir varias rutas calculadas.

## Ubicación desactivada

Mapa, búsqueda, fichas y origen manual continúan disponibles. No ofrecer seguimiento ni
decir “cerca de ti” sin ubicación suficientemente reciente.

## Seguridad de credenciales

- Los estilos y tiles públicos declaran atribución y límites por entorno.
- Operaciones privilegiadas, rutas y consumo controlado pasan por backend.
- El estilo y el endpoint de tiles son públicos y deben conservar atribución visible de
  OpenMapTiles y OpenStreetMap. Las credenciales privadas de rutas/geocodificación, si se
  incorporan, permanecen en backend.

## Navegación

- Comenzar solo con modos confirmados por el servicio y datos ecuatorianos.
- La primera versión online calcula auto, bicicleta y caminata con OSRM sin tráfico en
  tiempo real. El modo bus usa rutas institucionales publicadas en PostgreSQL, no un perfil
  OSRM genérico.
- La navegación activa requiere una sesión turística autenticada y se inicia explícitamente
  desde una ruta calculada. La vista previa de la ruta permanece disponible como invitado. En primer plano
  usa `Location.watchPositionAsync` para actualizar el mapa de inmediato y, mientras existe
  una sesión activa, `expo-location` mantiene una tarea de ubicación en segundo plano con
  el servicio foreground de Android. La tarea conserva únicamente la última posición en
  almacenamiento local; al volver a la app se restaura y se reevalúan indicaciones y
  desvíos. El permiso de segundo plano se solicita únicamente al iniciar esta función,
  después de explicar su finalidad y ofrecer una opción de rechazo. Si la persona lo
  rechaza, la navegación continúa mientras la app está visible, pero no registra la tarea
  persistente ni promete actualizaciones al cambiar de aplicación. En Android 13 o posterior
  también se solicita `POST_NOTIFICATIONS` cuando el seguimiento persistente está habilitado,
  para mostrar el servicio en el cajón de notificaciones.
- Al detenerla con la `X`, cancelar o abandonar la pantalla antes de iniciar la navegación, se
  eliminan el watcher, la tarea del sistema, la sesión persistida, la notificación foreground
  y la voz. Al llegar al destino, el modo activo conserva su pantalla y muestra el estado de
  llegada hasta que la persona lo cierre explícitamente. Minimizar la app o cambiar temporalmente
  de aplicación no equivale a cancelar:
  mientras la navegación siga activa, la tarea continúa bajo las condiciones permitidas por
  Android. La tarea también comprueba la distancia al destino cuando recibe una ubicación en
  segundo plano, para cerrar la sesión al llegar aunque la app no esté visible. El cuerpo de
  la misma notificación foreground se actualiza con la próxima maniobra y la distancia
  redondeada, sin crear notificaciones duplicadas. Cuando no hay una maniobra disponible
  comunica que la navegación sigue activa.
  Android 13 o posterior permite descartar manualmente notificaciones de foreground services;
  por eso el parche nativo comprueba la presencia del mismo registro en cada actualización de
  ubicación y lo vuelve a publicar si el sistema lo retiró. Esto no impide el botón del Task
  Manager que detiene toda la aplicación.
  En Android, el cambio de texto de un servicio ya registrado usa un parche fijado para
  `expo-location` 57.0.19: permite actualizar sus opciones mientras la actividad está
  pausada, pero mantiene bloqueado el inicio de un servicio nuevo desde segundo plano.
  No se guarda un historial de coordenadas ni se reinicia automáticamente una navegación
  después de forzar el cierre de la app.
- En móvil, la pantalla de ruta usa MapLibre a pantalla completa: la geometría y los
  extremos se dibujan como capas sobre el mapa. La vista previa de «Cómo llegar» mantiene
  el `BottomSheet` nativo desplazable con modo, tiempo e indicaciones. Al iniciar la
  navegación, la hoja se desmonta y aparece un modo activo independiente con la próxima
  maniobra, la posición actual, un control para recentrar y una barra inferior con tiempo
  restante, distancia y hora estimada. Ese modo bloquea el gesto de salida y el Atrás del
  sistema; solo la `X` lo cierra.
- Al abrir “Cómo llegar” desde un atractivo publicado, el cliente solicita la ubicación
  puntual y calcula automáticamente la primera ruta; iniciar la navegación sigue siendo
  una acción explícita. Si la ubicación o el cálculo fallan, el panel permite reintentar.
- La ficha rápida de un atractivo se puede cerrar tocando el mapa fuera de ella o
  deslizándola hacia abajo mientras está compacta. Al expandirse a pantalla completa,
  queda bloqueada y se cierra únicamente con la X para no interferir con el desplazamiento
  vertical ni horizontal de su contenido. Al abrirse, entra suavemente desde el borde
  inferior y el scrim aparece con un fade breve.
- El botón de ubicación solicita un enfoque animado, pero solo se oculta cuando el evento
  final del mapa confirma la coordenada y el zoom objetivo. Si la persona interrumpe el
  movimiento con un gesto, el enfoque pendiente se cancela y el botón permanece visible.
- Las instrucciones se leen en español con `expo-speech`. Si la posición queda a más de
  60 m del trazado, la API recalcula usando la ubicación actual como nuevo origen; no se
  guarda un historial de coordenadas.
- Advertir que horarios/precios de transporte registrado son informativos.
- No prometer rutas accesibles sin datos verificables.
- Segundo plano únicamente durante una función activa y con consentimiento específico.
- La navegación debe tolerar pérdida de señal y ubicación antigua; una posición guardada
  se usa como último estado conocido, no como una ubicación actual garantizada.

## Rendimiento del mapa

- Endpoint por viewport/zoom con límites y clustering cuando el catálogo pueda
  paginarse y cachearse sin reemplazar los símbolos durante un gesto.
- Respuestas compactas para marcadores; ficha completa bajo demanda.
- Cancelar consultas obsoletas al mover el mapa.
- Cachear catálogos/mapas públicos con política de invalidación por publicación.
- El cliente persiste la caché de consultas públicas durante 24 horas y evita repetir la
  petición al volver a una pestaña mientras el dato siga fresco; una revalidación puede
  ocurrir al recuperar conectividad o mediante una acción explícita.
- El estilo propio se cachea en memoria por combinación de tema y modo (`streets` o
  `navigation`), se deduplican solicitudes concurrentes y se muestran eventos de carga de
  MapLibre para evitar el destello negro durante el cambio de estilo.
- No reemplazar el `GeoJSONSource` en cada cambio de cámara: el catálogo ya
  cargado se mantiene durante pan/zoom. La consulta por viewport se habilitará
  con paginación, cache y cancelación de consultas obsoletas.
- En móvil, los centros públicos se renderizan como un `GeoJSONSource` nativo con
  `SymbolLayer`; MapLibre mantiene el conjunto de features y el clustering fuera del
  árbol React mientras el usuario hace zoom o panea. Los pines individuales usan un
  recurso de icono estático, sin una vista React ni un círculo de fondo. Los clusters sí
  usan una capa separada con conteo y se expanden mediante `getClusterExpansionZoom`.
  En el mapa en línea, ese conjunto proviene exclusivamente de una respuesta exitosa de
  `GET /api/v1/centers`; si la respuesta remota está vacía, no se crean pines de ejemplo ni
  se reutiliza el manifiesto offline.
- La selección es estado de la pantalla: el toque primero centra la cámara en el atractivo
  con el zoom de detalle predeterminado y luego presenta la ficha; una capa de símbolo
  separada pinta el pin seleccionado con el color de énfasis.
- Al abrir la pantalla principal, la aplicación solicita el permiso `while in use`; si la
  persona lo concede, obtiene una posición reciente, centra la cámara con zoom 15 y
  dibuja un punto azul en una fuente GeoJSON separada. Una única sesión global mantiene
  `Location.watchPositionAsync` mientras la app está en primer plano, comparte la
  posición entre Explorar, fichas y rutas, y vuelve a suscribirse al regresar desde otra
  pantalla o aplicación. Cuando la cámara queda centrada en la persona, el control de
  ubicación se oculta; una interacción que aleja el mapa lo vuelve a mostrar y al
  pulsarlo recentra con zoom 15. Si el GPS o el servicio de ubicación del dispositivo está
  apagado, el mismo control muestra una línea gris sobre el icono. Abrir Explorar por sí
  solo no inicia seguimiento en segundo plano: una función explícitamente habilitada debe
  solicitar el permiso y activar el servicio conforme a la plataforma.
- La brújula visual es un control reutilizable de la app: aparece al girar el mapa, se ubica
  encima del botón de ubicación y al pulsarla anima la cámara de vuelta al norte. El rumbo
  se mantiene como estado efímero de Explorar; no se persiste ni entra en el historial.
- Explorar mantiene el desplazamiento con un dedo y el giro táctil con dos dedos. El
  wrapper nativo de MapLibre prioriza el giro frente al pinch-zoom y reserva la inclinación
  para un gesto vertical de tres dedos, evitando que los gestos compitan entre sí.
- La disponibilidad del permiso y del proveedor se vuelve a comprobar mientras la sesión
  foreground está activa y al regresar de Ajustes u otra aplicación. Al desactivarse se
  detiene el watcher y se limpia la posición para no presentar una ubicación obsoleta;
  al volver a primer plano se intenta recuperar una posición reciente antes de reanudarlo.

## Paquetes offline por ciudad

La API pública expone `GET /api/v1/offline/cities` y
`GET /api/v1/offline/cities/:slug/manifest`. El manifiesto incluye atractivos publicados,
límites oficiales cuando están importados y rutas de transporte con una versión PUBLICADA.
La app descarga los tiles con `OfflineManager` y guarda el manifiesto en Expo SQLite. No se
intenta recalcular una ruta sin red: la fase offline usa rutas institucionales registradas.

La migración `20260917_offline_routes_and_city_packages.sql` crea los límites oficiales,
versiones editables/publicables de rutas y metadatos de paquetes. La edición y aprobación de
una geometría queda en el flujo administrativo autenticado; el móvil solo consume la
versión PUBLICADA.
