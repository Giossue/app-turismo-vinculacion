# Verification

## Comprobaciones realizadas

- `corepack pnpm --filter @turismo/api typecheck`, `lint` y `build`: correctos.
- Prettier desde el workspace API y `git diff --check`: correctos.
- `corepack pnpm openspec validate --all --strict`: 12 elementos correctos.
- Revisión de validación, proyección y lectura: SIN_INFORMACION se admite al
  publicar las tres decisiones y se proyecta a NULL; la lectura distingue
  true/false/NULL. La inclusión nula de clientes anteriores también se admite
  en la validación de captura. Se mantienen medios binarios, referencias activas,
  duplicados, permisos, estado de revisión y auditoría existentes.
- Migración revisada contra el bootstrap: dos DROP NOT NULL dentro de una
  transacción con lock_timeout 5s y statement_timeout 30s, sin DML ni backfill.
  No modifica IDs, grants ni secuencias.

## Contraste puntual con el libro original

Se extrajeron casillas y resultados guardados de las hojas ocultas del archivo
original mediante lectura ZIP/XML. Se pasaron sus señales a
`calculateXlsmValuation`, sin ejecutar fórmulas, macros ni escrituras:

| Criterio | Excel | Motor API |
| -------- | ----- | --------- |
| A        | 10    | 10        |
| B        | 4,5   | 4,5       |
| C        | 5     | 5         |
| D        | 9,5   | 9,5       |
| E        | 0     | 0         |
| F        | 0     | 0         |
| G        | 2     | 2         |
| H        | 0     | 0         |
| I        | 0     | 0         |
| Total    | 31    | 31        |

El motor conservó jerarquía 01. Este cálculo ya existía y no requirió cambiar sus
pesos. El problema corregido está en validación y persistencia de desconocidos.
La equivalencia usa señales originales de las hojas ocultas: no demuestra todo
el adaptador del formulario ni la configuración de catálogos en el despliegue.

## Aplicación autorizada de la migración

El usuario solicitó aplicar la migración y hacer push. Se verificó el destino
`turismo_vinculacion_app` en `187.127.6.234:8004`, identidad de la conexión y
propietario de base/tabla como el rol de la aplicación. Las credenciales locales
se consumieron solo en memoria desde pgpass, sin copiarlas ni registrarlas.

Antes de modificar la base se creó un respaldo custom de la tabla de Promoción,
con permisos privados y checksum. Se verificó su restauración en un cluster
PostgreSQL 18 aislado: tabla, datos, secuencia, índices, constraints y trigger.
Se aportó una referencia mínima de centros y la definición original de
`fn_set_updated_at` como dependencias del contexto de restauración. Esto verifica
el respaldo de la tabla afectada, sin afirmar restauración de toda la base.
El cluster se retiró; el respaldo y su dependencia permanecen fuera del repositorio
en el directorio privado de respaldos de Turismo.

Se ejecutó únicamente `20261011_promotion_unknown_responses.sql` mediante cliente
local PostgreSQL, asumiendo el propietario verificado de la aplicación. El archivo
se aplicó sin modificar su SQL, con checksum SHA-256
`ae273e4c09b010c3e0c962d2d8a58abd210671adf0a37fd07eee7f0811724481`.
Commit de la transacción verificado el 2026-10-11 a las 09:51:27 UTC; ejecución
observada de 161 ms.

Las tres columnas booleanas quedaron nullable. Se verificaron cero filas antes y
después, contenido sin cambios, propietario y ACL de tabla y secuencia intactos,
SELECT/INSERT/UPDATE/DELETE del rol API y USAGE/SELECT de la secuencia. La base no
contiene un ledger de migraciones; se conservó un registro local privado de esta
operación con checksum, destino, respaldo y comprobaciones, sin crear tablas
auxiliares ni modificar el historial de la aplicación.

## Límites y entrega

No se añadieron ni ejecutaron suites ni se publicó una ficha real. La solicitud
autoriza commit y push de ambos repositorios a main, con revisión completa del
diff y verificación posterior de hashes remotos. El despliegue manual no forma
parte de la solicitud. Falta comprobar API y panel desplegados y el flujo de
captura/publicación/lectura con Sin confirmar y catálogos reales. No volver a la
proyección anterior ni convertir NULL a false para un rollback automático.
