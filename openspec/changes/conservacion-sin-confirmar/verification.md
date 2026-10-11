# Verification

## Evidencia del archivo y destino

El worker del panel conserva ALTERADO/null y seis factores de la ficha original.
Las casillas de estado del entorno no están marcadas y Jerarquia!B41:B44 son
FALSE; C35 guarda 5 puntos. No se ejecutaron fórmulas o macros.

Se verificó en solo lectura turismo_vinculacion_app en 187.127.6.234:8004,
con identidad y transaction_read_only comprobadas. El borrador 020101MC010400011,
versión 6, está en revisión y contiene el mismo apartado que su revisión pendiente.
El estado del entorno es null y sus tres factores ya están guardados. En ese
diagnóstico inicial, estado_conservacion_id todavía era NOT NULL remotamente.

La versión anterior rechazó Conservación por el estado ausente. Con el servicio
compilado corregido, `requireComplete` y todas las validaciones de referencias
de esa revisión pasan usando exclusivamente SELECT sobre el destino verificado.
Se retiró FOR SHARE de las consultas del diagnóstico para mantener solo lectura:
esto no comprueba bloqueos, concurrencia, permisos HTTP ni aprobación real.

## Persistencia aislada

Se creó un PostgreSQL 18 local temporal con socket privado y sin escucha TCP,
con las seis tablas originales de Conservación y un padre mínimo para el centro.
Se copiaron en memoria los catálogos y la sección de esa revisión; las credenciales
no se escribieron en argumentos, registros ni archivos nuevos.

Se aplicó dos veces el SQL exacto preparado y se ejercitaron la validación,
proyección y lectura del servicio compilado contra PostgreSQL. Resultado:

- Atractivo ALTERADO, entorno NULL y tres factores por componente, con referencias,
  origen y respuestas conservados; declaratoria conservada.
- Progreso COMPLETA con el desconocido explícito.
- El adaptador y motor existentes calculan 5 puntos de Conservación, igual al Excel.
- Las tres FKs de evaluaciones siguen presentes tras la migración.

El cluster temporal se detuvo y eliminó. Este diagnóstico de la sección no
equivale a restaurar toda la base, comprobar PostGIS ni publicar toda la ficha.

## Calidad y pendientes

- Typecheck, lint y build de @turismo/api: aprobados.
- Prettier en archivos del cambio y `git diff --check`: aprobados.
- OpenSpec estricto completo: 13 aprobados, cero fallos; delta integrado.
- No se añadieron ni ejecutaron suites de pruebas o flujo HTTP autenticado.

## Aplicación remota autorizada

El usuario solicitó aplicar la migración en la base remota y hacer push; su
instrucción posterior «no respaldos» excluyó ese paso de esta operación.
No se creó ni restauró un respaldo para esta migración.

Se verificó de nuevo turismo_vinculacion_app en 187.127.6.234:8004, con propietario
turismo_vinculacion_app para base, evaluaciones, factores y sus secuencias. Se
ejecutó el SQL exacto como ese propietario, con bloqueo asesor de la operación,
lock_timeout 5s y statement_timeout 30s:

- Archivo: `20261011_conservation_unknown_state.sql`.
- SHA-256: `fd9e1651fdcd6f4ce60ade3ffa0ed6d9fd983dd4355925a8888248fc60eca4e5`.
- Commit confirmado: 2026-10-11T15:39:50.434Z; ejecución 160 ms.
- estado_conservacion_id pasó de NOT NULL a nullable; las demás columnas se conservaron.
- Filas y huellas de contenido de evaluaciones/factores permanecieron iguales:
  ambas tablas tenían cero filas antes y después.
- FKs, claves únicas, propietarios y ACL se conservaron; el rol de la API mantiene
  SELECT/INSERT/UPDATE/DELETE y USAGE/SELECT de ambas secuencias.
- No existe tabla de historial de migraciones en public; no se creó una auxiliar.
  Este registro conserva archivo, checksum, destino y resultado de la operación.

La sesión autoriza commit/push a main en API y panel. No se hizo despliegue manual
ni se aprobó/publicó la ficha remota; la aplicación de DDL no certifica esos pasos.
