# Proposal

## Why

El turista que ya está en un sitio quiere saber qué tiene alrededor sin escribir
una búsqueda. La API ya consulta centros y catastro por cercanía para el agente,
pero el móvil no ofrece una lista ordenada por distancia ni filtros simples.

## What Changes

- Nuevo endpoint público `GET /nearby` que combina centros y catastro publicados
  dentro de un radio acotado (100 m–20 km, 5 km por defecto), ordenados por
  distancia, con filtros fijos `all`, `attractions`, `food` y `lodging` y un
  límite de 1–50 resultados.
- Nueva pantalla móvil «Cerca de mí», abierta desde el menú, que pide la
  ubicación al abrirse, muestra la distancia en línea recta y abre la ficha del
  centro o del establecimiento.
- Hook reutilizable `useNearbyPlaces(coordinate, options)` para consultar
  lugares cercanos a cualquier punto (por ejemplo, el destino de una ruta).

El filtro «abierto ahora» queda fuera: los centros solo tienen hora de ingreso y
salida sin días de atención, y el catastro no tiene horarios estructurados.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `public-tourism-discovery`: lugares publicados cercanos a un punto.

## Impact

Módulo NestJS nuevo `nearby` que reutiliza el repositorio público de centros y
`EstablishmentsService.nearbyPublicPlaces`; sin migraciones ni dependencias. En
el móvil, la feature `nearby`, la ruta `/nearby` y una entrada de menú. La
coordenada se redondea a unos 100 m, no se persiste en la caché ni se registra
en la API. Requiere desplegar la API para que la pantalla tenga datos.
