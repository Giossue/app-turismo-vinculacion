# Identidad y autorización

## Propiedad

El backend NestJS es dueño de registro, verificación, login, recuperación, tokens,
revocación y roles. No se delega autenticación al proveedor de mapas/rutas ni al proveedor de IA.

## Credenciales

- Contraseñas con Argon2id y parámetros calibrados.
- Access JWT breve, firmado y con `sub`, identificador de sesión (`sid`), roles y audiencia.
- Refresh token opaco, aleatorio, rotado y almacenado como hash.
- Detección de reutilización revoca la familia de sesión.
- Tokens de verificación/recuperación de un solo uso, con hash y expiración.

## Clientes

- Móvil: access token en memoria; refresh token en Secure Storage.
- Web: refresh token en cookie `HttpOnly`, `Secure`, `SameSite`; no en localStorage.
- Cerrar sesión revoca el refresh token y limpia cachés privadas.

El cliente móvil ofrece una entrada única para iniciar sesión, crear una cuenta turística
o explorar como invitado. El registro crea únicamente una cuenta con rol `TURISTA` y usa
`nombre`, `email`, `genero` obligatorio (opciones `Masculino` o `Femenino`) y `fecha_nac`
opcional de `usuarios`; la fecha se selecciona mediante el calendario nativo y no admite
fechas futuras. `activo`, las marcas de verificación y las fechas quedan bajo control del
backend. Mientras no exista
un proveedor institucional de correo configurado, `email_verified_at` permanece disponible
para el futuro flujo de verificación y no se simula una verificación en el cliente.

En la web, el access token se reconstruye al cargar la aplicación mediante
`POST /auth/refresh`; no se persiste en `localStorage`. La cookie de renovación tiene
caducidad explícita y cada renovación inserta primero la nueva sesión dentro de la misma
transacción que revoca y enlaza la anterior, para respetar la FK de sesiones y mantener
la sesión después de recargar. El cliente coordina la renovación para que Strict Mode y
recargas simultáneas no roten dos veces el mismo refresh token: reutiliza una promesa en
la pestaña y, cuando el navegador lo soporta, toma un Web Lock exclusivo entre pestañas.
La API tolera durante diez segundos la repetición de un token recién reemplazado para
absorber una carrera legítima de recarga sin revocar la familia; una reutilización fuera
de esa ventana mantiene la revocación por seguridad.

## Autorización

Roles iniciales: `TURISTA` y `ADMINISTRADOR`.

El administrador es responsable de crear, editar, revisar, publicar y desactivar fichas
turísticas. El turista consulta contenido publicado y usa las funciones propias de la
aplicación; no accede al panel institucional. No se separa la captura en un rol de guía
en esta fase.

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

El API aplica un límite HTTP global inicial mediante Fastify. Antes de operar varias
instancias, el almacenamiento del rate limit debe cambiarse a Redis para conservar el
límite de forma distribuida.
