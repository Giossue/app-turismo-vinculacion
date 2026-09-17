# Identidad y autorización

## Propiedad

El backend NestJS es dueño de registro, verificación, login, recuperación, tokens,
revocación y roles. No se delega autenticación al proveedor de mapas/rutas ni al proveedor de IA.

## Credenciales

- Contraseñas con Argon2id y parámetros calibrados.
- Access JWT breve, firmado y con `sub`, versión de sesión y audiencia.
- Refresh token opaco, aleatorio, rotado y almacenado como hash.
- Detección de reutilización revoca la familia de sesión.
- Tokens de verificación/recuperación de un solo uso, con hash y expiración.

## Clientes

- Móvil: access token en memoria; refresh token en Secure Storage.
- Web: refresh token en cookie `HttpOnly`, `Secure`, `SameSite`; no en localStorage.
- Cerrar sesión revoca el refresh token y limpia cachés privadas.

## Autorización

Roles iniciales: `TURISTA`, `GESTOR`, `REVISOR`, `ADMINISTRADOR`.

Cada caso de uso valida:

1. identidad;
2. rol/capacidad;
3. propiedad o ámbito del registro;
4. estado permitido de la ficha;
5. campos modificables.

Una única cuenta administradora inicial no implica codificar cardinalidad 1:1. El modelo
debe admitir más personas e instituciones en el futuro.

## Controles

Rate limit en login, registro, recuperación, opiniones e IA. No revelar si un correo
existe. Registrar fallos relevantes sin contraseñas, tokens ni cabeceras completas.
