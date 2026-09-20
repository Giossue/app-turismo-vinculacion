# Feature: descubrimiento móvil público

## Resultado

Una persona turista puede abrir la aplicación móvil, conocer que explora atractivos
publicados y ver su listado sin iniciar sesión. Al abrir el mapa, la aplicación solicita
ubicación foreground para mostrar su posición; si la deniega, puede seguir explorando.

## Actores y permisos

- Visitante: consulta centros públicos.
- La ubicación se solicita al abrir Explorar o al activar “Servicios cercanos” o una ruta;
  explorar atractivos continúa disponible aunque se deniegue el permiso. La sesión
  foreground se conserva entre pantallas mientras la app está abierta.

## Flujo principal

1. La aplicación pide `GET /api/v1/centers` a través de un repositorio.
2. Muestra una lista accesible de fichas resumidas.
3. Si falla la red, explica el error y permite reintentar.
4. El mapa MapLibre muestra los centros publicados como marcadores.
5. Al abrir el mapa, la aplicación valida permiso y GPS, centra la cámara y muestra un
   punto azul mientras el proveedor esté disponible; el watcher foreground actualiza la
   posición mientras la app está activa y se reanuda al volver a ella. El botón “mi
   ubicación” permite reintentar o recentrar manualmente.
6. La persona puede cambiar a `Servicios cercanos`, escribir una actividad (por ejemplo,
   alimentación) y enviarla desde el teclado; la API devuelve establecimientos activos y,
   si la localidad actual no tiene resultados, informa la ciudad más cercana con resultados.
7. La persona puede escribir una consulta y enviarla desde el teclado; los resultados
   aparecen en una ficha inferior deslizable sin abandonar el mapa.

## Estados y excepciones

- Carga: indicador semántico de progreso.
- Vacío: mensaje sin datos inventados.
- Error/sin red: alternativa y reintento.
- Ubicación denegada, GPS apagado o señal degradada: se comunica el estado, se retira el
  punto azul si estaba visible y explorar sigue disponible.
- Búsqueda: mientras se escribe no se consulta la API; al enviar se buscan al menos dos
  caracteres en nombre, descripción y clasificación. La respuesta puede estar vacía o
  fallar sin bloquear el mapa.
- Catastro: la búsqueda de servicios requiere ubicación foreground puntual; si se deniega,
  el mapa continúa disponible y se ofrece reintentar. La respuesta distingue localidad
  solicitada, localidad efectiva, fallback y distancia aproximada.

## Datos e integraciones

- Solo lectura de datos publicados de la API institucional.
- Una respuesta remota vacía produce un mapa sin pines; no se generan atractivos de ejemplo
  ni se usan centros offline como sustituto dentro de Explorar.
- No se guardan coordenadas históricas del dispositivo, cuentas ni tokens.
- La URL del backend se inyecta por variable pública `EXPO_PUBLIC_API_URL`, sin secretos.

## Fuera de alcance

- Rutas, navegación giro a giro, cache offline y autenticación.
