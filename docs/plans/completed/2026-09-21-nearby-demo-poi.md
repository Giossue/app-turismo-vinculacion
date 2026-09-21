# Plan: POI demostrativo cercano al centro de Guaranda

## Objetivo

Crear un catastro demostrativo visible en el mapa a diez metros del único centro turístico
publicado de Guaranda para verificar el flujo de selección de lugares cercanos.

## Alcance

- Calcular la posición con PostGIS a diez metros al este del centro.
- Vincular el registro con la taxonomía de centro de recreación turística.
- Mantener la coordenada marcada como aproximada y el nombre identificado como demo.
- Forzar al móvil a renovar la consulta del mapa.

## Estado

- [x] Crear y validar la migración idempotente.
- [x] Aplicarla en la base desplegada.
- [x] Confirmar una distancia de diez metros y la respuesta del API.

## Resultado

El registro `Punto de interés cercano (demo)` quedó a 10,015 metros del centro, diferencia
mínima causada por la precisión de seis decimales del esquema. El API lo entrega como
`ticket`, rojo y con coordenada aproximada. Una segunda ejecución no actualizó filas.
