# Migraciones del entorno local

`dev-local.sh` aplica las migraciones incrementales una sola vez mediante
`apply-local-migrations.sh`. La tabla local `local_schema_migrations` guarda nombre,
checksum SHA-256, fecha y origen (`EXECUTED`, `BOOTSTRAP` o `CHECKPOINT`). El runner
mantiene un bloqueo de sesión para serializar arranques sobre la misma base y registra
cada archivo únicamente cuando `psql` termina de ejecutarlo sin errores.

Las bases nuevas reciben primero el bootstrap y después las migraciones pendientes.
Una modificación de un archivo ya registrado se rechaza: crear una migración nueva.
Los archivos aplicados no se vuelven a ejecutar; las opciones eliminadas y su auditoría
conservan su estado al reiniciar.

## Bases locales existentes sin historial

Se adopta como checkpoint `20261002_admin_logical_deletion.sql` únicamente después de
verificar las ocho columnas de eliminación, las siete restricciones que impiden activar
registros eliminados, las tres acciones de auditoría `ELIMINAR` y los dos índices de
opiniones vigentes. Entonces se registran los archivos hasta ese checkpoint sin ejecutar
su SQL y se aplican únicamente los posteriores.

Si la verificación falla, el runner se detiene con una explicación. Para una base local
que ya recibió las migraciones históricas, verificar su esquema y aplicar una vez
`database/migrations/20261002_admin_logical_deletion.sql` mediante el procedimiento local
habitual; el siguiente arranque adoptará el checkpoint. No ejecutar de nuevo los seeds
ni las restricciones de auditoría antiguas para inicializar el historial.

El runner no se usa para administrar producción. `--fresh` se reserva para el bootstrap
que acaba de crear `dev-local.sh`; no debe utilizarse para adoptar una base existente.

## Prueba de integración

`test-local-migrations.sh` requiere `TURISMO_MIGRATION_TEST_DATABASE_URL` apuntando a una
base temporal vacía de PostgreSQL. Verifica migraciones pendientes, reinicio después de
eliminar, rollback y reintento, cambios de checksum, rechazo de checkpoints incompletos y
adopción de una base existente. La prueba rechaza bases con tablas públicas existentes.
