# Feature: descubrimiento móvil público

## Resultado

Una persona turista puede abrir la aplicación móvil, conocer que explora atractivos
publicados y ver su listado sin iniciar sesión ni conceder ubicación. Si necesita
orientarse en el mapa, puede solicitar su posición de forma explícita.

## Actores y permisos

- Visitante: consulta centros públicos.
- La ubicación se solicita únicamente al activar “mi ubicación”; explorar no requiere
  permisos del dispositivo.

## Flujo principal

1. La aplicación pide `GET /api/v1/centers` a través de un repositorio.
2. Muestra una lista accesible de fichas resumidas.
3. Si falla la red, explica el error y permite reintentar.
4. El mapa MapLibre muestra los centros publicados como marcadores.
5. Al pulsar “mi ubicación”, la aplicación valida permiso y GPS, centra la cámara y
   muestra un punto azul mientras el proveedor esté disponible.
6. La persona puede escribir una consulta y enviarla desde el teclado; los resultados
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

## Datos e integraciones

- Solo lectura de datos publicados de la API institucional.
- No se guardan coordenadas históricas del dispositivo, cuentas ni tokens.
- La URL del backend se inyecta por variable pública `EXPO_PUBLIC_API_URL`, sin secretos.

## Fuera de alcance

- Rutas, navegación giro a giro, cache offline y autenticación.
