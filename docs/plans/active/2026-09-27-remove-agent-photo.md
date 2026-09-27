# Retirar fotos del agente turístico

Fecha: 2026-09-27

## Alcance

La persona turista podrá seguir consultando al agente por texto y voz, pero no
podrá tomar ni elegir una imagen para enviarla al agente. Se elimina la ruta
`POST /ai/media/photo` para que clientes antiguos tampoco puedan enviar fotos.
Las imágenes publicadas de lugares y la multimedia del panel administrativo
siguen fuera de este cambio.

## Fronteras

- Actor: turista autenticado; se conserva la autorización del chat y la voz.
- No cambian visibilidad de catálogos, titularidad, ubicación ni modo sin conexión.
- Se deja de enviar imágenes al proveedor externo y de solicitar permisos de
  cámara/galería por esta función.
- La retirada del plugin nativo exige reconstruir el binario móvil para eliminar
  los permisos nativos; Metro solo actualiza el código JavaScript.

## Trabajo

- [x] Quitar controles y cliente de fotos del móvil.
- [x] Quitar el análisis visual y la ruta HTTP de la API.
- [x] Actualizar dependencias, pruebas y documentación.
- [x] Verificar tipos, lint y pruebas; la API local devuelve 404 en la ruta
      de fotos y mantiene la transcripción de voz. Android se regeneró,
      compiló e instaló sin permiso de cámara.
- [ ] Publicar la API actualizada: la API remota seguirá aceptando solicitudes
      de clientes antiguos hasta desplegar este cambio.
