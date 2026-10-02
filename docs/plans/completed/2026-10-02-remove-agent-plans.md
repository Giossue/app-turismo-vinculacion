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

Implementado y verificado en código.

## Resultados

- API: 30 archivos de pruebas y 162 pruebas correctas.
- Móvil: 41 archivos de pruebas y 190 pruebas correctas.
- Formato, lint y TypeScript correctos en ambos paquetes.
- Compilación de API y exportación web del móvil correctas.
- Pruebas de regresión cubren la retirada del campo `itinerary`, la consulta rápida
  y la herramienta de planificación; se conserva cobertura de rutas confirmadas,
  catálogo, voz e historial voluntario.
- Sin referencias de ejecución a servicios, pantallas o almacenamiento de planes.
- No se probó manualmente en Android/iOS ni se realizó un despliegue.
