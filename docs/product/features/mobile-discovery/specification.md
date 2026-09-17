# Feature: descubrimiento móvil público

## Resultado

Una persona turista puede abrir la aplicación móvil, conocer que explora atractivos
publicados y ver su listado sin iniciar sesión ni conceder ubicación.

## Actores y permisos

- Visitante: consulta centros públicos.
- No se solicita ningún permiso del dispositivo en esta feature.

## Flujo principal

1. La aplicación pide `GET /api/v1/centers` a través de un repositorio.
2. Muestra una lista accesible de fichas resumidas.
3. Si falla la red, explica el error y permite reintentar.
4. El mapa MapLibre muestra los centros publicados como marcadores.

## Estados y excepciones

- Carga: indicador semántico de progreso.
- Vacío: mensaje sin datos inventados.
- Error/sin red: alternativa y reintento.
- Ubicación: no se usa; explorar sigue siendo independiente de GPS.

## Datos e integraciones

- Solo lectura de datos publicados de la API institucional.
- No se guardan coordenadas del dispositivo, cuentas ni tokens.
- La URL del backend se inyecta por variable pública `EXPO_PUBLIC_API_URL`, sin secretos.

## Fuera de alcance

- GPS, rutas, navegación, cache offline y autenticación.
