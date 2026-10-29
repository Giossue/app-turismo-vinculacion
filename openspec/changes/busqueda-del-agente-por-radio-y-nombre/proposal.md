# Proposal

## Why

El agente devolvió un lugar lejanísimo cuando se esperaba "cerca (5 km)", y al preguntar por «La Tola» no la encontró. Solo `searchNearbyPublishedPlaces` usa radio; `searchNearbyEstablishments` salta a otra localidad sin límite de distancia y `searchPublishedCenters` solo busca centros, mientras «La Tola Glamping» es un establecimiento.

## What Changes

- Una sola herramienta `searchPlaces` (texto, tipo `center|food|lodging|establishment|any`, `nearby` con radio) sustituye a `searchPublishedCenters`, `listPublishedCenters`, `searchPublishedEstablishments`, `listPublishedEstablishments`, `searchNearbyPublishedPlaces` y `searchNearbyEstablishments`.
- Con `nearby` el radio es real y, si no hay nada, devuelve `outsideRadius` con el más cercano (hasta 300 km) y su distancia, para presentarlo como lejano.
- Los endpoints HTTP no cambian.
- Prompt actualizado con estas reglas.

## Capabilities

### Modified Capabilities

- `tourism-agent`: búsqueda por nombre unificada y cercanía honesta.

## Impact

Solo `AiAgentService` y sus pruebas; sin migraciones. Cambia el nombre de herramienta visible en las trazas de diagnóstico.
