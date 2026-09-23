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
  los pines sobre un fondo local neutro; las capas de texto esperan a que exista una URL de fuentes válida.
  La app normaliza las familias tipográficas del estilo a `Noto Sans Regular`, que es la
  familia publicada por el endpoint de glifos del TileServer.
  No cambia a ArcGIS o Stadia.
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

### Geocodificación y búsqueda

- `GET /api/v1/search` combina dos fuentes: centros y establecimientos propios publicados
  desde PostgreSQL, y resultados geográficos de Photon para calles, ciudades y referencias
  públicas.
- Photon se consulta únicamente desde la API, usando el servicio privado `photon-ecuador`
  dentro de `dokploy-network` y restringiendo la búsqueda a Ecuador (`countrycode=EC`). La
  aplicación móvil nunca llama directamente a Photon ni a Nominatim.
- Un fallo o timeout de Photon degrada la búsqueda geográfica, pero no oculta los centros ni
  catastros propios que sí estén disponibles.
- El panel administrativo no guarda una dirección inferida por geocodificación. Al crear o
  editar una ficha o un catastro, el operador abre un modal MapLibre, hace clic en el mapa y
  confirma únicamente latitud y longitud; la dirección descriptiva continúa siendo un campo
  independiente.

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
  almacenamiento local; al volver a la app se espera una lectura fresca antes de reanudar
  indicaciones y desvíos. El permiso de segundo plano se solicita únicamente al iniciar esta función,
  después de explicar su finalidad y ofrecer una opción de rechazo. Si la persona lo
  rechaza, la navegación continúa mientras la app está visible, pero no registra la tarea
  persistente ni promete actualizaciones al cambiar de aplicación. En Android 13 o posterior
  también se solicita `POST_NOTIFICATIONS` cuando el seguimiento persistente está habilitado,
  para mostrar el servicio en el cajón de notificaciones.
- Al detenerla con la `X` o cuando otra pantalla cubre la ruta, se eliminan el watcher, la
  tarea del sistema, la sesión persistida, la notificación foreground y la voz, y el estado
  visible se reinicia; antes de iniciarla no hay seguimiento que limpiar. Si la tarea
  persistente no puede iniciarse, la navegación continúa con la app abierta y lo avisa en
  pantalla. Al llegar al destino, el modo activo conserva su pantalla y muestra el estado de
  llegada hasta que la persona lo cierre explícitamente. Minimizar la app o cambiar temporalmente
  de aplicación no equivale a cancelar:
  mientras la navegación siga activa, la tarea continúa bajo las condiciones permitidas por
  Android. La tarea también comprueba la distancia al destino cuando recibe una ubicación en
  segundo plano, para cerrar la sesión al llegar aunque la app no esté visible. Solo la tarea
  actualiza el cuerpo de la misma notificación foreground con la próxima maniobra y la
  distancia redondeada, sin crear notificaciones duplicadas. Cuando no hay una maniobra disponible
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
  extremos se dibujan como capas sobre el mapa. La vista previa de «Cómo llegar» muestra
  los puntos de origen y destino y usa un panel inline sobre el mapa con modo, tiempo e
  indicaciones; el mapa sigue siendo manipulable y una interacción del usuario contrae el
  panel sin desmontar ni cerrar la ruta. El resumen superior conserva el origen «Tu
  ubicación» y el destino. Al iniciar la navegación, el punto de origen se oculta, el panel
  se desmonta y aparece un modo activo independiente con la próxima maniobra, un indicador
  de posición con flecha orientable, un control para recentrar y una barra inferior con
  tiempo restante, distancia y hora estimada. Mientras el seguimiento está activo, la cámara usa
  zoom 19 y una inclinación de 60 grados; su rumbo se orienta con la brújula del dispositivo
  usando el rumbo verdadero cuando está disponible y el magnético como respaldo, con un suavizado
  circular para evitar saltos bruscos sin cambiar la fuente del sensor; el rumbo llega al mapa
  como máximo unas cinco veces por segundo y solo con cambios de 2 grados o más. El objetivo
  geográfico de la cámara se adelanta 30 m en ese rumbo para que el icono quede detrás, en la
  zona inferior de la pantalla, y la perspectiva mantenga visible el trayecto que viene delante.
  Un gesto manual libera el seguimiento; el control de recentrado lo restablece y, sin nuevos
  gestos, se reanuda solo a los 7 segundos. Al cerrar la navegación, la cámara vuelve a la
  vista general de la ruta orientada al norte y sin inclinación. El mapa permite
  inclinación táctil de tres dedos y rotación
  para que la perspectiva se pueda ajustar sin otro control de brújula. Ese modo bloquea el
  gesto de salida y el Atrás del sistema; la `X` regresa a la vista previa. Desde la vista
  previa, Atrás o el control explícito de cierre cierra la ruta y regresa a la ficha del
  atractivo.
- Al abrir “Cómo llegar” desde un atractivo publicado, el cliente solicita la ubicación
  puntual fresca y con precisión suficiente, y calcula automáticamente la primera ruta;
  iniciar la navegación sigue siendo una acción explícita. Si la ubicación o el cálculo
  fallan, el panel permite reintentar.
- La ficha rápida de un atractivo se puede cerrar tocando el mapa fuera de ella o
  deslizándola hacia abajo mientras está compacta. Al expandirse a pantalla completa,
  queda bloqueada y se cierra únicamente con la X para no interferir con el desplazamiento
  vertical ni horizontal de su contenido. Al abrirse, entra suavemente desde el borde
  inferior y el scrim aparece con un fade breve.
- El botón de ubicación solicita un enfoque animado, pero solo se oculta cuando el evento
  final del mapa confirma la coordenada y el zoom objetivo. Si la persona interrumpe el
  movimiento con un gesto, el enfoque pendiente se cancela y el botón permanece visible.
- Las instrucciones se leen en español con `expo-speech`; cada aviso encola la maniobra actual
  y la siguiente, y descarta una secuencia anterior cuando cambia la ruta. Si la posición queda
  a más de 60 m del trazado, la API recalcula usando la ubicación actual como nuevo origen; no se
  guarda un historial de coordenadas.
- Advertir que horarios/precios de transporte registrado son informativos.
- No prometer rutas accesibles sin datos verificables.
- Segundo plano únicamente durante una función activa y con consentimiento específico.
- La navegación debe tolerar pérdida de señal sin convertir una posición antigua en una
  ubicación actual: las muestras con precisión superior a 100 m se descartan y las
  indicaciones esperan una lectura aceptable. La posición persistida solo permite que el
  servicio conserve continuidad y no se dibuja ni recalcula hasta recibir un punto fresco.

## Rendimiento del mapa

- Endpoint por viewport con límites, límite de resultados y clustering nativo para que el
  catálogo no cargue toda la base en cada apertura.
- Respuestas compactas para marcadores; ficha completa bajo demanda.
- Cancelar consultas obsoletas al mover el mapa.
- Cachear catálogos/mapas públicos con política de invalidación por publicación.
- El cliente persiste la caché de consultas públicas durante 24 horas y evita repetir la
  petición al volver a una pestaña mientras el dato siga fresco; una revalidación puede
  ocurrir al recuperar conectividad o mediante una acción explícita.
- El estilo propio se cachea en memoria por combinación de tema y modo (`streets` o
  `navigation`), se deduplican solicitudes concurrentes y se muestran eventos de carga de
  MapLibre para evitar el destello negro durante el cambio de estilo.
- Mantener los resultados anteriores mientras llega la consulta del nuevo viewport y dejar
  que TanStack Query cancele la consulta obsoleta mediante `AbortSignal`.
- La búsqueda del móvil conserva en la misma respuesta los resultados propios y los
  geográficos. Seleccionar un centro o catastro propio abre su ficha o detalle; seleccionar
  una calle, ciudad u otra referencia geográfica solo centra el mapa y no crea una ficha.
- En móvil, los centros públicos se renderizan como un `GeoJSONSource` nativo con
  `SymbolLayer`; MapLibre mantiene el conjunto de features y el clustering fuera del
  árbol React mientras el usuario hace zoom o panea. Los pines individuales usan un
  recurso de icono estático, sin una vista React ni un círculo de fondo. Los clusters sí
  usan una capa separada con conteo y se expanden mediante `getClusterExpansionZoom`.
  Los establecimientos activos del catastro llegan desde `GET /api/v1/establishments/map`
  en una fuente GeoJSON separada, limitada y agrupada; reciben el pin Osmic y el color fijo
  que el sistema asigna a su clasificación/tipo de establecimiento, además de la etiqueta
  contextual de su categoría. El panel administrativo solo permite seleccionar el icono;
  no recibe un color editable. Cuando un
  registro histórico fue completado con la coordenada de su localidad,
  el endpoint conserva la marca de punto aproximado; las nuevas coordenadas capturadas por
  operación se publican como ubicación exacta.
  Los centros turísticos usan exclusivamente el pin Osmic `tourism-monument`, recoloreado
  con el verde institucional; ese código no pertenece al catálogo de catastros.
  En el mapa en línea, ese conjunto proviene exclusivamente de una respuesta exitosa de
  `GET /api/v1/centers`; si la respuesta remota está vacía, no se crean pines de ejemplo ni
  se reutiliza el manifiesto offline.
- La selección es estado de la pantalla: el toque presenta la ficha enseguida y, al mismo
  tiempo, la cámara centra el atractivo con el zoom de detalle predeterminado en la parte
  visible del mapa, encima de la ficha. El pin seleccionado se ve
  igual que el resto: no se agranda ni cambia de icono.
- Al abrir la pantalla principal no se solicita la ubicación: `while in use` se pide al tocar
  "mi ubicación", activar "Servicios cercanos" o iniciar una ruta; si la
  persona lo concede, espera una posición fresca con precisión de 100 m o menos, centra la
  cámara con zoom 15 y dibuja un punto azul en una fuente GeoJSON separada. Una única
  sesión global mantiene `Location.watchPositionAsync` con alta precisión mientras la app
  está en primer plano, comparte la posición entre Explorar, fichas y rutas, y vuelve a
  suscribirse al regresar desde otra pantalla o aplicación. Cuando la cámara queda centrada en la persona, el control de
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
  al volver a primer plano se solicita una posición fresca y precisa antes de reanudarlo.

## Paquetes offline por ciudad

La API pública expone `GET /api/v1/offline/cities` y
`GET /api/v1/offline/cities/:slug/manifest`. El manifiesto incluye atractivos publicados,
límites oficiales cuando están importados y rutas de transporte con una versión PUBLICADA.
La app descarga los tiles con `OfflineManager` y guarda el manifiesto en Expo SQLite. Cada
descarga usa un paquete nuevo; los anteriores de la ciudad se borran solo al completarse, y
después se guarda el manifiesto. No se
intenta recalcular una ruta sin red: la fase offline usa rutas institucionales registradas.

La migración `20260917_offline_routes_and_city_packages.sql` crea los límites oficiales,
versiones editables/publicables de rutas y metadatos de paquetes. La edición y aprobación de
una geometría queda en el flujo administrativo autenticado; el móvil solo consume la
versión PUBLICADA.
