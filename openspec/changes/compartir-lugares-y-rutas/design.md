# Design

## Context

La API ya sirve páginas HTML públicas fuera del prefijo `api/v1`: `/e/:id` (código QR de establecimientos, con «Abrir en la app» mediante `rumbo-ec://establishments/:id`) y `/descargar`. La app usa el scheme `rumbo-ec` y Expo Router resuelve `rumbo-ec://centers/:code`, `rumbo-ec://establishments/:id` y `rumbo-ec://route?...` hacia las pantallas existentes.

## Goals / Non-Goals

**Goals:** compartir un lugar o una ruta con un enlace que funcione en cualquier navegador, abra la app si está instalada y ofrezca descargarla si no.

**Non-Goals:** Android App Links verificados (apertura directa del https en la app), iOS Universal Links, acortadores externos o compartir la geometría calculada de la ruta.

## Decisions

### Enlace https sobre el origen de la API

El enlace se construye con el origen de `EXPO_PUBLIC_API_URL`, igual que la descarga del aviso de actualización. Un enlace `rumbo-ec://` no es clicable en la mayoría de mensajerías y no sirve sin la app; la página intermedia sí.

### Ruta = destino y modo

`/r` lleva destino, nombre y modo. Quien lo abre calcula la ruta desde su propia posición; compartir la geometría no tendría sentido desde otro origen y alargaría el enlace. Las coordenadas se redondean a seis decimales.

### Validación de entrada no confiable

Los parámetros del enlace se validan en ambos lados. La API rechaza códigos no alfanuméricos sin consultar la base, devuelve 404/400 con una página HTML y escapa todo lo que imprime; las páginas usan la misma CSP sin scripts que `/e/:id`. La app solo acepta códigos `[A-Za-z0-9-]{1,40}`, ids de hasta 12 dígitos, coordenadas WGS84 y nombres limpios de hasta 120 caracteres.

### Superficies

Brief: turista con una ficha o una ruta abierta; objetivo enviarla a otra persona; decisión compartir; información mínima nombre y enlace; acción principal abrir la hoja del sistema. El ícono se añade a `PlaceActions` para no crear otra fila; en la ruta, «Compartir ruta» va en el área expandida para no alterar la altura del panel contraído. Cancelar la hoja no muestra error.

## Risks / Trade-offs

- Sin App Links verificados, Android abre el enlace en el navegador y la persona toca «Abrir en la app». Verificarlos requiere `assetlinks.json` con la huella SHA-256 del certificado de firma de la release y un `intentFilter` con `autoVerify`; queda pendiente porque esa huella no está en el repositorio.
- Si cambia el dominio de la API, los enlaces ya compartidos dejan de abrir.
