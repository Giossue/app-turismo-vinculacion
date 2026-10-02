# Retirar planes del agente turístico

## Solicitud

Eliminar la función de planes e itinerarios de la app.

## Alcance

- Retirar «Mis planes», la consulta rápida, las tarjetas de itinerario y su edición.
- Eliminar herramientas, contratos y endpoints de itinerarios de la API.
- Mantener consultas de lugares, transporte, rutas individuales, voz e historial.
- Actualizar especificación, arquitectura y pruebas de móvil/API.
- Conservar migraciones históricas y datos existentes: esta retirada no cambia el
  esquema ni ejecuta operaciones sobre bases de datos.

## Verificación

- Formato, lint, tipos, pruebas de móvil/API y build de API.
- Comprobar que no quedan referencias de ejecución a planes.
- Registrar limitaciones de verificación en dispositivo.

## Estado

En implementación.
