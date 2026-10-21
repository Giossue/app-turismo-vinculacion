# Tasks

## 1. Móvil

- [x] 1.1 Construir enlaces `/c`, `/e` y `/r` sobre el origen de la API y abrir la hoja nativa de compartir.
- [x] 1.2 Añadir compartir a `PlaceActions` en fichas y hojas de centros y establecimientos, y «Compartir ruta» en la vista previa.
- [x] 1.3 Validar código de centro, id de establecimiento y nombre del destino recibidos por enlace; Atrás sin historial vuelve al mapa.
- [x] 1.4 Pruebas de construcción de enlaces y limpieza de parámetros.

## 2. API

- [x] 2.1 Páginas `/c/:code` y `/r` sin scripts, con apertura en la app, «Cómo llegar» y descarga, fuera del prefijo `api/v1`.
- [x] 2.2 Validar y escapar parámetros; 404/400 con página de error.
- [x] 2.3 Enlace de descarga en la página del QR y pruebas de las páginas.

## 3. Pendiente

- [x] 3.1 Android App Links: `/.well-known/assetlinks.json` publica la huella SHA-256 del certificado que firma el APK (sobrescribible con `ANDROID_APP_CERT_SHA256`), `intentFilters` con `autoVerify` para `/c/`, `/e/` y `/r`, y `+native-intent.tsx` traduce esas rutas a las pantallas internas.
- [ ] 3.2 Probar en un dispositivo: hoja de compartir, apertura de cada enlace con y sin la app instalada.
