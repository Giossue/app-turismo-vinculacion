# Tasks

## 1. Datos

- [x] 1.1 Añadir `contentSizeBytes` al resumen local: `length(CAST(payload_json AS BLOB))` en SQLite y `TextEncoder` en web; validar el campo opcional al leer.

## 2. Presentación

- [x] 2.1 Crear la lógica pura de uso de espacio, total, formato de tamaños y fechas y detección de versiones, con pruebas.
- [x] 2.2 Mostrar espacio, fecha y actualización disponible en la tarjeta de ciudad y el total en la cabecera de descargas.

## 3. Integración

- [x] 3.1 Ejecutar formato, lint, tipos y pruebas del paquete móvil.
- [ ] 3.2 Comprobar en un dispositivo Android los tamaños con una ciudad real descargada.
