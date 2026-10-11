# Design

## Fuentes

`centros_turisticos.zona_turistica_id` ya es nullable por la migración
`20261005_tourist_zone_optional.sql`. «Entorno de Guaranda» se creó en el seed
histórico `20260920_z1_seed_guaranda_zone.sql`. No hay que ejecutar otro seed ni
modificar las relaciones existentes para quitar esa decisión de la captura.

## Selección geográfica

Los centros del manifiesto se seleccionan por `ubicacion` dentro del límite
vigente o del rectángulo de respaldo que ya usa la descarga. Se mantienen activo
y PUBLICADO como condiciones de visibilidad. Una zona nula, retirada o diferente
no decide la pertenencia geográfica del centro.

El catálogo usa la misma cobertura y selección. Las rutas institucionales se
incluyen si están publicadas y asociadas al menos a un centro público de esa
área, conservando una sola versión por ruta. Los POIs mantienen su relación de
zona porque no pertenecen a la ficha MINTUR; los catastros conservan su selección.

## Frescura y compatibilidad

Las versiones automáticas pasan a timestamps en milisegundos, enteros seguros
para JavaScript y SQLite, para ofrecer actualización del manifiesto anterior
aunque no cambien sus filas. La forma pública sigue siendo un número positivo.
El mapeo convierte el BIGINT devuelto por PostgreSQL, que puede ser texto.

La fecha más reciente de cambios de centros se calcula una vez para el catálogo,
incluyendo centros retirados y cambios de coordenadas. Esta invalidación
conservadora puede anunciar una actualización en ciudades sin cambios locales;
evita que mover un centro fuera de una cobertura haga retroceder su versión.
Las importaciones de límites participan también en la fecha de contenido.
No se guardan borradores dentro del manifiesto.

No se requiere migración ni backfill. Mantener contratos anteriores y el esquema
nullable existente. Desplegar API y panel; actualizar las descargas conservadas
para incorporar el contenido geográfico.

La validación administrativa admite una zona histórica sin cambios aunque
se retire del catálogo: ya no hay selector para sustituirla. Nuevas referencias
de clientes anteriores siguen exigiendo una zona activa; permisos, auditoría y
validación territorial de la ficha mantienen su flujo habitual.

## Frontera

Lecturas parametrizadas y solo contenido público. Sin escritura, modificación
de permisos, credenciales ni publicación automática. Conservar ámbito de rutas,
validación de área y error cuando no hay geometría ni coordenadas válidas.

## Comprobación

Revisar SQL contra el esquema, comprobar tipos, lint, formato, compilación y
OpenSpec. Registrar qué no se ejecutó; no afirmar cobertura de PostgreSQL real,
dispositivo o despliegue a partir de esas comprobaciones estáticas.
