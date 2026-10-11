# Comprobación

## Implementación

Centros y rutas de los manifiestos usan el mismo límite vigente o rectángulo
de respaldo que la descarga. La disponibilidad del catálogo aplica la selección
geográfica de centros. No se exige zona ni se asigna la del seed de demostración.
La versión usa milisegundos y se normaliza el BIGINT a número; el móvil y SQLite
admiten esos enteros seguros sin cambiar la forma de las descargas existentes.

Las referencias históricas de zona sin cambios se conservan aunque se retiren
del catálogo; una nueva asignación sigue exigiendo una zona activa. Se conserva
autorización, concurrencia, revisión y auditoría existentes.

## Comprobaciones estáticas

- `corepack pnpm --filter @turismo/api typecheck`: sin errores.
- `corepack pnpm --filter @turismo/api lint`: sin errores ni advertencias.
- `corepack pnpm --filter @turismo/api build`: compilación completa.
- Formato de los archivos cambiados y `git diff --check`: comprobados.
- `corepack pnpm openspec validate --all --strict`: once elementos válidos.

## Lecturas SQL

El servidor local de desarrollo en el puerto 55433 no estaba iniciado. Se
comprobaron las consultas compiladas contra la base remota objetivo
`turismo_vinculacion_app`, verificando identidad y destino antes de consultar.
Las credenciales se consumieron de `.pgpass` solo en memoria. Todas las consultas
se ejecutaron dentro de `REPEATABLE READ READ ONLY`, con plazo de cinco segundos
y cierre mediante `ROLLBACK`; no se alteraron registros ni esquema.

La columna `centros_turisticos.zona_turistica_id` ya admite NULL: este cambio no
requiere aplicar una migración nueva. El catálogo devolvió 222 ciudades y ninguna
descargable con los datos actuales; Guaranda no tenía contenido público descargable.
La consulta real no habilitó su manifiesto ni se publicó contenido para comprobarlo.

Para inspeccionar el SQL del manifiesto, el adaptador del diagnóstico permitió
esa rama con metadatos de disponibilidad sintéticos únicamente en memoria.
Se planificaron y ejecutaron las consultas originales sobre filas reales usando
`EXPLAIN (ANALYZE, BUFFERS)`, sin errores. Esto verifica compatibilidad del SQL,
no acredita un paquete publicado o una descarga funcional.

Las dos ejecuciones de catálogo tardaron 5,597 y 3,794 ms; límite oficial 0,084 ms;
centros 0,231 ms; rutas 0,170 ms; catastros 0,213 ms; POIs 0,665 ms. Centros y rutas
devolvieron cero filas públicas. Son mediciones diagnósticas con esos datos, no
un benchmark representativo de volumen o carga. La versión sintética en texto
se convirtió en un número entero seguro al construir el resultado diagnóstico.

## Límites y entrega

La fecha de cambios de centros se comparte entre ciudades para detectar salidas
de cobertura; puede anunciar actualizaciones sin cambios locales. El flujo móvil
actual actualiza mediante acción del usuario, sin descargar automáticamente todas
esas ciudades.

No se añadieron ni ejecutaron suites. No se comprobó el flujo de publicación ni
una descarga móvil con centros públicos sin zona, puesto que la base consultada
no los ofrecía. No se escribió en la base, no se publicaron fichas, no se aplicaron
migraciones ni se hizo despliegue o instalación móvil. El usuario autorizó después
commit y push para la entrega. Desplegar API y panel y actualizar las descargas
anteriores para obtener el contenido nuevo.
