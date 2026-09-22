# Zona turística demostrativa de Guaranda

## Objetivo

Crear una zona turística completa en la localidad activa `Guaranda` sin cambiar el
esquema existente. La carga sirve para probar el mapa, los selects territoriales y la
relación de una ficha con una zona.

## Datos cargados

- Zona: `Entorno de Guaranda`, con coordenadas de la localidad y estado activo.
- Punto: `Plaza cultural de Guaranda`, con coordenadas, descripción y estado activo.
- Punto: `Sendero panorámico de Guaranda`, con coordenadas, descripción y estado activo.
- Las coordenadas y descripciones son referenciales de demostración y deben validarse
  institucionalmente antes de una publicación productiva.

La operación es idempotente por `(localidad_id, nombre)` para la zona y por
`(zona_turistica_id, nombre)` en la carga de los puntos (la tabla de puntos no tiene una
restricción única declarada, por lo que la migración actualiza primero y solo inserta si
no existe el nombre).

## Imágenes generadas

Se generaron con GPT Image y se copiaron al repositorio como material visual de seed:

| Archivo | Uso referencial | SHA-256 |
| --- | --- | --- |
| `assets/seed-tourism-media/zona-entorno-guaranda/01-panorama-urbano-guaranda.png` | Vista urbana andina | `b545b6ad9b78a6123b439633970ca2f204d9f3e21c0c865ac878dd9ee8093492` |
| `assets/seed-tourism-media/zona-entorno-guaranda/02-plaza-guaranda.png` | Espacio público cultural | `58608046fde13ed004b5c7567ede307a06cb02de428265f7f6955eaac253aa36` |
| `assets/seed-tourism-media/zona-entorno-guaranda/03-sendero-panoramico-guaranda.png` | Entorno paisajístico | `28eee599ecd3dc75032035c8ab0f3aa414f0b3a11ca546b956138e587f79002f` |

Las imágenes son ilustrativas, no una afirmación de que representen un sitio exacto.
La tabla territorial no recibe multimedia directamente. La ficha visible que usa el mapa
se crea mediante `20260920_z2_seed_guaranda_ficha.sql` como un centro turístico dentro de
esta zona, y allí sí se registran las fotografías con la relación multimedia existente.

## Verificación

Aplicar `database/migrations/20260920_z1_seed_guaranda_zone.sql` con `ON_ERROR_STOP=1`,
ejecutarlo dos veces y comprobar que existe una zona activa en Guaranda, dos puntos
activos y ningún duplicado creado por la segunda ejecución.

Resultado remoto del 20 de septiembre de 2026: la primera ejecución creó la zona con
`id = 1` y dos puntos; la segunda actualizó esos dos puntos e insertó cero filas nuevas.
La consulta final confirmó una sola zona `Entorno de Guaranda` y exactamente dos puntos
activos asociados.
