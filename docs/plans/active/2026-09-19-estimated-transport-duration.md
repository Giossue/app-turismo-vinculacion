# Duración estimada de rutas de transporte

## Objetivo

Cuando una ruta administrada no tenga `duracion_estimada`, publicar en el manifiesto
una duración calculada desde la longitud de su geometría PostGIS y una velocidad media
por tipo de transporte, sin considerar tráfico en tiempo real.

## Alcance

- Mantener la duración introducida por el administrador como valor prioritario.
- Calcular una estimación para rutas publicadas sin duración.
- Exponer si el valor es estimado para que el móvil no lo presente como dato confirmado.
- Usar velocidades conservadoras configuradas en el dominio, con `bus` como caso inicial.

## Fuera de alcance

- Tráfico en tiempo real.
- GTFS o planificación de transbordos.
- Edición administrativa completa de rutas y paradas.
- Recalcular rutas offline con OSRM.

## Verificación

- Prueba unitaria de conversión distancia/velocidad.
- Pruebas de contrato del manifiesto offline.
- Typecheck, lint y tests de API y móvil.
- Confirmar que `NULL` sigue siendo posible cuando no existe geometría publicada.
