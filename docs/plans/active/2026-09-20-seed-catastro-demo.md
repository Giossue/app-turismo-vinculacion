# Seed demostrativo del catastro nacional

Fecha: 2026-09-20
Estado: completado (2026-09-20)

## Objetivo

Cargar una muestra operativa del libro `temp/Consolidado-Nacional-2026-publico-8 (1).xlsx`
para probar el módulo de catastro y el fallback territorial sin importar todavía las
36.017 filas nacionales. La muestra tendrá 10 establecimientos ratificados por ciudad
en Guaranda, Riobamba, Ambato, Latacunga y Babahoyo.

## Reglas de selección

- Solo se usan filas con estado `RATIFICADO` y nombre comercial no vacío.
- Se restringen las filas a parroquias urbanas de la cabecera cantonal; el destino
  persiste la localidad ciudad y no inventa direcciones, teléfonos ni coordenadas de
  establecimientos que no existen en la fuente.
- Se ordena por `Número de Registro` y se toman las primeras 10 filas únicas por ciudad,
  de modo que el resultado sea reproducible.
- Las coordenadas cargadas son puntos aproximados de las cinco cabeceras para habilitar
  el descubrimiento por cercanía; no son coordenadas de cada establecimiento.

## Persistencia

Se añade una migración SQL transaccional e idempotente. Resuelve cada ciudad mediante
los códigos DPA activos, crea o reactiva la localidad `CIUDAD` y hace upsert de los 50
establecimientos por `numero_registro`. No elimina, desactiva ni modifica registros
fuera del subconjunto elegido.

## Verificación

Después de aplicar la migración se comprueba que existan cinco localidades activas con
coordenadas, diez establecimientos activos por localidad, 50 registros en total y cero
duplicados de número de registro. La migración se ejecuta dos veces para comprobar que
la segunda ejecución no duplica filas.

Resultado remoto: ambas ejecuciones terminaron con `COMMIT`; quedaron cinco localidades
`CIUDAD`, diez establecimientos activos por localidad, 50 establecimientos en total y
cinco puntos con coordenadas para la búsqueda por cercanía. La segunda ejecución no
incrementó los conteos.

## Fuente reproducible

- Archivo: `temp/Consolidado-Nacional-2026-publico-8 (1).xlsx`
- SHA-256: `3e5598c95edb2b4dc31ce0f776742e0bea59c146a2d9cb7087e0c47b53374e7d`
- Generador: `scripts/generate-catastro-demo-migration.py`
