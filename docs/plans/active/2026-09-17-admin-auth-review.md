# Panel administrativo: autenticación y revisión de fichas

## Objetivo

Entregar el primer vertical slice operativo del repositorio `web-turismo-admin` sin
duplicar datos ni acceso a PostgreSQL: el panel y la app móvil consumen la misma API
NestJS, que es la única frontera con PostgreSQL.

## Alcance

- Autenticación institucional con Argon2id, JWT de corta duración y refresh token
  rotatorio almacenado como hash en PostgreSQL.
- Cookie HttpOnly para el refresh del navegador; el access token solo vive en memoria
  del cliente administrativo.
- Si expira el access token con el panel abierto, el cliente renueva la sesión y reintenta
  una sola solicitud `401`; si falla, limpia la sesión en memoria.
- Guards de autenticación y el rol institucional `ADMINISTRADOR`; `TURISTA` queda fuera
  del panel.
- Listado de fichas y revisión aprobar/rechazar con transacción y auditoría.
- UI MUI plana: sin sombras ni bordes en superficies, tokens compartidos y componentes
  pequeños reutilizables.

## Decisiones y límites

- No se crea una conexión del panel o de la app móvil a PostgreSQL.
- No se crea un usuario administrador con contraseña en una migración. La cuenta inicial
  debe provisionarse fuera del repositorio mediante un flujo seguro de administración.
- La autorización se aplica en la API; ocultar `/admin` no es una medida de seguridad.
- El rate limit se deja preparado en la frontera HTTP y debe usar Redis en despliegues
  multi-instancia antes de producción.

## Verificación

- API: format, lint, typecheck y pruebas unitarias de auth/revisión.
- Admin: format, lint, typecheck y build.
- Revisar que el refresh no aparezca en `localStorage`, que los roles se validen en API
  y que aprobar/rechazar genere auditoría.
- Verificar recuperación automática después de dejar expirar el access token sin recargar
  el panel.

## Estado

Implementado el vertical slice inicial. Queda fuera de este corte la pantalla completa
de captura de fichas y el aprovisionamiento de cuentas institucionales; ambos deben
seguir pasando por la API y sus controles de rol/auditoría.
