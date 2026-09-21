# Plan: distribuir coordenadas aproximadas del catastro demo

## Objetivo

Separar visualmente los 50 establecimientos demostrativos que actualmente comparten la
coordenada central de su localidad, sin presentar las nuevas posiciones como ubicaciones
reales.

## Alcance

- Distribuir diez catastros alrededor de cada una de estas localidades: Guaranda,
  Riobamba, Ambato, Latacunga y Babahoyo.
- Mantener `coordenadas_aproximadas = TRUE`.
- Sincronizar automáticamente la columna PostGIS `ubicacion` mediante el trigger existente.
- Detener la migración si el conjunto previo ya no coincide con los 50 registros demo que
  todavía conservan la coordenada exacta de su localidad.

## Despliegue y recuperación

- Aplicar después de `20260921_establishment_coordinates_required.sql`.
- La precondición evita sobrescribir coordenadas enriquecidas posteriormente desde el panel.
- Para revertir, devolver únicamente las filas aproximadas objetivo a la latitud y longitud
  de su localidad; el trigger reconstruye `ubicacion`.
- No requiere bloqueo prolongado: actualiza 50 filas dentro de una transacción.

## Verificación

- Confirmar diez registros aproximados por localidad.
- Confirmar que ninguna localidad conserve catastros demo apilados.
- Medir separación mínima y distancia máxima respecto del centro de cada localidad.

## Estado

- [x] Crear migración idempotente y documentarla.
- [x] Validar en una transacción revertida.
- [x] Aplicar en la base desplegada y comprobar resultados.

## Resultado

Se actualizaron 50 registros. Cada localidad conserva diez posiciones únicas, con una
separación mínima aproximada de 471 metros y una distancia máxima de 1,29 kilómetros
respecto de su centro. Todos mantienen `coordenadas_aproximadas = TRUE`; una segunda
ejecución actualizó cero filas.
