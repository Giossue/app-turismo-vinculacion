# Design

## Context

Cada descarga guarda un manifiesto (lugares, rutas y estilos) en SQLite (`offline_city_manifests`) o AsyncStorage en web, y los mosaicos en un paquete de MapLibre cuyo tamaño ya se conserva en `download.resourceSizeBytes`. El listado lee resúmenes con JSON1 sin deserializar el contenido completo.

## Decisions

- **Tamaño del contenido al leer.** La consulta de resúmenes añade `length(CAST(payload_json AS BLOB))`, que da los bytes UTF-8 sin cargar el JSON en JavaScript. En web se mide la cadena guardada con `TextEncoder`. No se añade columna ni migración.
- **Sin datos inventados.** Si ni MapLibre ni el almacenamiento informan un tamaño, la tarjeta lo omite. El total suma solo las descargas con tamaño conocido.
- **Versión nueva por comparación de paquetes.** El catálogo remoto ya publica `package.version`; si es mayor que la guardada se muestra la actualización disponible. Sin conexión solo se muestra la fecha.
- **Formato.** KB sin decimales (mínimo 1 KB si hay contenido), MB y GB con un decimal y coma decimal; fecha larga en español («3 de octubre de 2026»).

## Risks

- El tamaño del manifiesto no incluye la sobrecarga de páginas de SQLite; es una aproximación suficiente para decidir qué borrar.
