# Proposal

## Why

Quien descarga varias ciudades no sabe cuánto espacio le ocupa cada una ni si la copia está al día. La tarjeta solo mostraba el tamaño de los mosaicos del mapa y la fecha en formato numérico, sin contar el contenido local ni avisar cuando el catálogo publica una versión más nueva.

## What Changes

- Medir el contenido local de cada descarga (bytes del manifiesto en SQLite o AsyncStorage) junto con los mosaicos que informa MapLibre.
- Mostrar en cada ciudad descargada el espacio total con su desglose (mapa y lugares) y la fecha de la última actualización en español.
- Mostrar el espacio total que ocupan todas las descargas en la cabecera de «Mapas descargados».
- Cuando el catálogo remoto publica una versión de paquete mayor que la guardada, indicar «Actualización disponible» y destacar la acción Actualizar.
- Añadir pruebas de la lógica de tamaños, fechas, sumas y detección de versiones.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `offline-city-content`: información de espacio, fecha y versión disponible en las descargas.

## Impact

Afecta `apps/mobile/src/features/offline` y `apps/mobile/src/app/offline.tsx`. No cambia la API, el esquema SQLite ni los permisos; el tamaño del contenido se calcula al leer los resúmenes. Las fotografías no se descargan con el paquete, por lo que no forman parte del cálculo.
