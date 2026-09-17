# Bootstrap móvil y descubrimiento público

## Objetivo

Instalar Flutter en el entorno local y crear la aplicación Android/iOS con una primera
experiencia de descubrimiento que consume los centros publicados de la API. Preparar el
límite de ArcGIS sin fingir que puede verificarse en Linux.

## Alcance

- SDK Flutter local, proyecto `apps/mobile` y pruebas/análisis ejecutables.
- Estructura por `core` y feature `discovery` con Riverpod y repositorio HTTP.
- Lista accesible de centros publicados, carga, vacío, error y reintento.
- Contrato de mapa y vista de reserva sin solicitar GPS ni persistir ubicación.
- Android configurado para el mínimo requerido por ArcGIS (API 28) y documentado.

## Fuera de alcance

- Instalar o compilar `arcgis_maps`: Esri documenta macOS/Windows como plataformas de
  desarrollo compatibles para el SDK Flutter actual; esta máquina es Linux.
- API key, ubicación, navegación, rutas, login, favoritos, caché offline o captura.
- Validación en Android/iOS físico, que requiere sus toolchains y dispositivos.

## Riesgos

- El proveedor de mapas no se puede probar localmente hasta trabajar desde Windows o
  macOS con una credencial ArcGIS restringida.
- La API se ejecuta en la máquina anfitriona; un emulador Android necesitará la URL de
  host especial que se documentará, no `127.0.0.1`.

## Verificación

- `flutter analyze` y `flutter test`.
- Prueba de repositorio con respuestas HTTP de éxito, vacío y error.
- Comprobación manual de la API local usada por el cliente.

## Resultado real

Este plan fue sustituido antes de implementar código: ArcGIS Maps SDK for Flutter no
admite Linux como host de desarrollo. Se descartó la copia local parcial de Flutter y se
reemplaza por el plan React Native/Expo/MapLibre.

## Estado

Sustituido el 2026-09-16.
