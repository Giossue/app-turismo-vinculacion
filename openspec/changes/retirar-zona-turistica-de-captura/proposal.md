# Proposal

## Why

La captura institucional expone una zona interna que no procede de la ficha
MINTUR. La API admite centros sin zona, pero sus manifiestos offline los
excluyen al exigir esa relación. Ocultar el selector debe conservar la utilidad
de las fichas nuevas en las descargas móviles.

## What Changes

- Resolver centros publicados por sus coordenadas y la cobertura de ciudad.
- Aplicar la misma selección al catálogo descargable y a las rutas asociadas.
- Conservar la cobertura oficial o el rectángulo de respaldo ya definidos.
- Actualizar la versión para distinguir manifiestos geográficos de los anteriores
  y detectar cambios de ubicación o retirada de publicación.
- Conservar zonas, POIs y contratos históricos sin alterar datos por SQL.
- Permitir conservar una referencia histórica de zona sin cambios aunque se retire
  del catálogo, manteniendo validación para nuevas asignaciones de clientes anteriores.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `offline-city-content`: contenido geográfico independiente de zona de captura.
- `institutional-publication`: compatibilidad de referencias internas históricas.

## Impact

Repositorio PostgreSQL/PostGIS offline, documentación y panel hermano. No hay
cambios de esquema ni migraciones nuevas. No se publican registros, no se aplican
seeds y no se cambia el formato del manifiesto o de las descargas existentes.
El usuario autoriza implementación, commit y push de este cambio. La entrega no
incluye despliegue ni ejecución de suites.
