# Plan: consolidar autorización en dos roles

## Objetivo

Mantener únicamente `ADMINISTRADOR` y `TURISTA`: el administrador crea, edita, revisa,
publica y gestiona las fichas; el turista consulta el contenido publicado y sus
funciones de usuario.

## Alcance

- API, tipos de claims, guards y controladores administrativos.
- Panel web: acceso operativo solo para administradores.
- Baseline y migración versionada para convertir usuarios `REVISOR`/`GESTOR` existentes
  a `ADMINISTRADOR` sin borrar cuentas.
- Documentación, pruebas negativas y datos de roles.

## Seguridad y compatibilidad

- No se eliminan usuarios ni sesiones durante la migración.
- Se deduplican asignaciones y luego se retiran únicamente los roles obsoletos.
- Los access tokens antiguos dejan de autorizar operaciones cuando expiran; el refresh
  emite los roles actuales desde PostgreSQL.

## Verificación

- API: formato, lint, typecheck, pruebas y build.
- Panel: `bun run verify`.
- Ejecutar la migración en la base local y comprobar que solo existen los dos roles.

## Resultado

Completado el 2026-09-18. La API y el panel solo reconocen `ADMINISTRADOR` y `TURISTA`.
El panel se reserva al administrador; el turista recibe una pantalla de acceso no
autorizado. La migración local se ejecutó correctamente: existe un administrador y los
roles disponibles quedaron reducidos a `ADMINISTRADOR` y `TURISTA`.

Verificación: formato, lint, typecheck, build y 17 pruebas Vitest en la API; `bun run
verify` en el panel.

La comprobación HTTP local confirmó `ADMINISTRADOR = 200` y `TURISTA = 403` en
`GET /api/v1/admin/summary`.
