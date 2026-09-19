# Mapas, rutas y navegación

## Responsabilidades

### MapLibre

- Renderizado nativo de mapas base, capas y marcadores en Android/iOS.
- Estilos de mapa y tiles configurados por entorno; el estilo de demostración nunca se usa
  en producción.
- El mapa móvil usa el estilo configurado en `EXPO_PUBLIC_TILESERVER_STYLE_URL`, servido
  por el TileServer GL propio (`https://mapas.devs-ueb.tech`) y respaldado por los tiles
  vectoriales OpenMapTiles generados desde OpenStreetMap para Ecuador. La app descarga el
  JSON del estilo, sustituye la referencia TileJSON por la plantilla explícita
  `/data/v3/{z}/{x}/{y}.pbf` que MapLibre Native requiere y aplica una paleta propia para
  terreno, edificios, agua, zonas verdes y calles. Si el servidor no responde, conserva
  los pines sobre un fondo local neutro; no cambia a ArcGIS o Stadia.
- No calcula rutas ni provee navegación por sí mismo.

### Proveedor de rutas

- Geocodificación, cálculo de ruta, instrucciones, recálculo y mapas offline si se aprueba.
- Se consume desde el backend mediante un puerto para preservar la posibilidad de cambiar
  proveedor y proteger credenciales de servicios privilegiados.

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
- Advertir que horarios/precios de transporte registrado son informativos.
- No prometer rutas accesibles sin datos verificables.
- Segundo plano únicamente durante una sesión activa.
- La navegación debe tolerar pérdida de señal y ubicación antigua.

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
- La selección es estado de la pantalla: el toque primero centra la cámara en el atractivo
  con el zoom de detalle predeterminado y luego presenta la ficha; una capa de símbolo
  separada pinta el pin seleccionado con el color de énfasis.
- La ubicación del turista se obtiene bajo demanda con permiso `while in use`; el botón
  de ubicación centra la cámara con zoom 15 y dibuja un punto azul en una fuente GeoJSON
  separada. No se inicia seguimiento en segundo plano desde Explorar.
- La brújula nativa de MapLibre aparece al girar el mapa y se ubica encima del botón de
  ubicación para permitir volver al norte sin añadir estado de rotación duplicado en React.
- La disponibilidad del permiso y del proveedor se vuelve a comprobar mientras Explorar
  está visible y al regresar de Ajustes; al desactivarse se limpia la posición local para
  no presentar una ubicación obsoleta.

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
