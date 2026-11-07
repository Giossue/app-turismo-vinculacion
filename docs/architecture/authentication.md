# Identidad y autorización

## Propiedad

El backend NestJS es dueño del registro turístico, login, tokens, revocación y roles.
Verificación por correo, recuperación y MFA requieren un flujo específico;
no se dan por implementados por una instrucción de la plantilla. No se delega autenticación al proveedor de mapas/rutas ni al proveedor de IA.

## Credenciales

- Contraseñas con Argon2id y parámetros calibrados.
- Access JWT breve, firmado y con `sub`, identificador de sesión (`sid`), roles y audiencia.
- Refresh token opaco, aleatorio, rotado y almacenado como hash.
- Detección de reutilización revoca la familia de sesión.
- Al añadir verificación/recuperación: tokens de un solo uso, hash y expiración.
  El controlador actual no ofrece esos endpoints.

## Clientes

- Móvil: access token en memoria; refresh token y perfil mínimo en SecureStore nativo.
  Las variantes web del cliente usan su implementación de almacenamiento específica.
- Web: refresh token en cookie `HttpOnly`, `Secure`, `SameSite`; no en localStorage.
- Cerrar sesión revoca el refresh token y limpia cachés privadas.

En móvil, `MobileSession` coordina una renovación por generación de sesión. El fetcher
solo adjunta credenciales a la API configurada, propaga cancelación y repite como máximo
una vez un `401` autenticado; un `401` recibido después de renovar usa ese acceso sin
rotarlo otra vez. Cerrar sesión o iniciar otra invalida de inmediato la generación,
retira datos privados y ordena el borrado local; la revocación remota no bloquea esa
limpieza. Cambiar identidad o roles durante la renovación también invalida los callbacks
anteriores. Guardar tokens y perfil y borrarlos son operaciones serializadas; los errores
de borrado local se propagan sin conservar acceso en memoria. Un error de red o `5xx`
conserva el perfil local para uso sin conexión, mientras un rechazo de la API elimina la
sesión. La restauración espera la hidratación de consultas y valida su propietario;
política y retención en [mobile.md](mobile.md#caché-y-funcionamiento-sin-conexión).

El cliente móvil ofrece una entrada única para iniciar sesión, crear una cuenta turística
o explorar como invitado. El registro crea únicamente una cuenta con rol `TURISTA` y usa
`nombre`, `email`, `genero` obligatorio (opciones `Masculino` o `Femenino`) y `fecha_nac`
obligatoria de `usuarios`; la fecha se selecciona mediante el calendario nativo y no admite
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
Si un access token expira mientras el panel permanece abierto, el cliente administrativo
renueva la sesión y repite una sola solicitud que recibió `401`; si la renovación falla,
limpia el access token en memoria y devuelve al inicio de sesión.

## Aceptación legal

`GET /legal/documents` publica sin sesión la versión vigente de `terms` y `privacy`. Los
textos son módulos versionados de `apps/api/src/legal/`: una versión publicada no se edita,
un cambio crea un módulo nuevo y requiere desplegar la API. El correo de contacto sale de
una sola constante, `LEGAL_CONTACT_EMAIL`.

`POST /auth/mobile/register` exige `birthDate` y `acceptedLegal: { terms, privacy }`, y
admite `appVersion` (hasta 32 caracteres). La cuenta y sus constancias se crean en la misma
transacción. La edad se calcula con la fecha del servidor en `America/Guayaquil`: quien
cumple 15 años ese día se acepta, y quien nació un 29 de febrero los cumple el 1 de marzo
en un año común.

El perfil de sesión (login, refresh, registro y `GET /auth/me`) añade
`pendingLegalDocuments`: los documentos vigentes sin constancia en su versión vigente.
Siempre es `[]` para una cuenta cuyo único rol no sea `TURISTA`. La API no bloquea a quien
tiene pendientes, porque un APK antiguo no puede aceptarlos; el bloqueo vive en el móvil.

`POST /auth/legal-acceptances`, con sesión, recibe `{ acceptedLegal: { terms?, privacy? },
appVersion? }` con al menos un documento y devuelve `{ data: { pendingLegalDocuments } }`.
Es idempotente: inserta con `ON CONFLICT DO NOTHING`, así que repetirla conserva la primera
constancia. No existe ruta para cambiar o borrar constancias.

`GET /admin/users` añade `legalAcceptance` a cada cuenta turística, con `upToDate` y la
última versión y fecha de cada documento, y `null` a las institucionales.

## Eliminación de la cuenta

`POST /auth/account/delete`, con sesión, recibe `{ password }` y devuelve
`{ data: { deleted: true } }`. Solo admite cuentas cuyo único rol en la base es `TURISTA`.
La contraseña incorrecta responde `400` y no `401`, porque el móvil interpreta `401` como
una sesión vencida. Una segunda solicitud, simultánea o posterior, recibe `401`. El detalle
de los datos está en [database.md](database.md#eliminación-de-cuentas-turísticas).

La transacción bloquea primero las sesiones de la cuenta y después la cuenta, el mismo
orden de `refresh`. Las sesiones se borran, de modo que un refresh token previo ya no
existe, y `activo = FALSE` cubre cualquier sesión que llegue a crearse en paralelo.

Un access token sigue firmado hasta expirar, así que `AuthGuard` consulta `eliminado_at`
en cada solicitud autenticada y rechaza con `401` el de una cuenta eliminada. Si la base no
responde, el error no se presenta como sesión inválida. Una solicitud que ya pasó el guard
cuando la eliminación termina todavía puede completar su escritura: esa ventana no se cierra.

## Errores con código

El cuerpo de error es `{ "error": { "code", "message" } }`. `HttpExceptionFilter` deriva
`code` del estado (`HTTP_401`, `HTTP_400`...); `AuthController` añade
`CodedHttpExceptionFilter` para los casos que el cliente distingue:

| Estado | `code` | Caso |
| --- | --- | --- |
| 400 | `UNDERAGE` | Menor de 15 años en el registro. |
| 409 | `LEGAL_VERSION_OUTDATED` | La versión declarada no es la vigente. |
| 400 | `INVALID_PASSWORD` | Contraseña incorrecta al eliminar la cuenta. |
| 403 | `ACCOUNT_NOT_DELETABLE` | La cuenta tiene un rol distinto de `TURISTA`, o ninguno. |

Bajo `tsx` (`dev:local`) no se emite metadata de decoradores y el `ValidationPipe` no valida
los DTO; por eso `AuthService` comprueba por sí mismo la fecha y las aceptaciones.

## Autorización

Roles iniciales: `TURISTA`, `AGENTE_TURISTICO` y `ADMINISTRADOR`.

El turista consulta contenido publicado y usa las funciones propias de la aplicación; no
accede al panel institucional. El agente turístico crea y completa sus fichas y catastros,
los guarda como borrador y los envía a revisión. El administrador tiene ámbito global:
consulta el contenido completo enviado, decide aprobar o rechazar, publica fichas y
administra catálogos.

Cada caso de uso valida:

1. identidad;
2. rol/capacidad;
3. propiedad o ámbito del registro;
4. estado permitido de la ficha;
5. campos modificables.

La propiedad del agente se comprueba en cada lectura y mutación administrativa. Los
registros de centros y catastros enviados por un agente permanecen fuera de la consulta
pública hasta que una decisión administrativa los publique.

Una única cuenta administradora inicial no implica codificar cardinalidad 1:1. El modelo
debe admitir más personas e instituciones en el futuro.

## Controles

Rate limit en login, registro, recuperación, opiniones, IA y eliminación de cuenta (diez
intentos por minuto). No revelar si un correo
existe. Registrar fallos relevantes sin contraseñas, tokens ni cabeceras completas.

El API aplica un límite HTTP global inicial mediante Fastify. Antes de operar varias
instancias, el almacenamiento del rate limit debe cambiarse a Redis para conservar el
límite de forma distribuida.
