# Proposal

## Why

La valoración de las hojas ocultas del XLSM no requiere una respuesta negativa
para calcular cero puntos. La API sí exige Sí o No en las preguntas de Promoción
al publicar y su tabla normalizada no admite desconocido para plan y paquete.
Así una importación fiel queda bloqueada; permitirla también requiere corregir
la proyección binaria para que no transforme el desconocido en No.

## What Changes

- Publicar las preguntas de Promoción con SI, NO o SIN_INFORMACION.
- Persistir la ausencia como NULL y leerla como SIN_INFORMACION.
- Conservar las respuestas afirmativas/negativas y los avisos de contradicción
  en el panel, sin modificar automáticamente los hechos del archivo.
- Preparar una migración aditiva que haga nullable plan y paquete.
- Conservar los pesos 2/2/3 y los demás controles de publicación.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `institutional-publication`: Promoción desconocida compatible con publicación
  y lectura fiel.

## Impact

Servicio administrativo, proyección normalizada y migración SQL. Coordinar con
el panel externo. La sesión autoriza implementación, aplicación de la migración,
commit y push en ambos repositorios. No incluye despliegue manual ni suites.
