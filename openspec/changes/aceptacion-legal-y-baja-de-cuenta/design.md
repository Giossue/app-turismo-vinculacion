# Design

## Context

- `AuthService.register` inserta en `usuarios` y `usuarios_roles` en una transacción con SQL directo.
  Es la única vía pública de alta; `auth:create-user` crea cuentas institucionales.
- `usuarios` no tiene borrado lógico. Casi todas las FK hacia ella usan `ON DELETE RESTRICT`.
- La API usa `forbidNonWhitelisted` y no hay actualización forzada: `/app/latest` solo alimenta un
  diálogo que se puede descartar.
- El móvil no tiene casilla de verificación ni documentos legales.
- El agente guarda cada turno durante 30 días aunque no exista historial activado, y la voz se
  transcribe con OpenAI. La política debe declararlo.

## Goals / Non-Goals

**Goals:**

- Probar qué versión aceptó cada cuenta y cuándo.
- Cambiar el texto legal sin publicar un APK.
- Eliminar los datos personales sin romper las referencias institucionales.

**Non-Goals:**

- Verificar la edad con documentos: la fecha es declarada.
- Tratar a menores ya registrados: la consulta se resuelve aparte con la institución.
- Guardar IP o agente de usuario: la API no tiene `trustProxy` y la IP podría ser la del proxy.

## Decisions

### Tabla de constancias en vez de columna en `usuarios`

Tabla `aceptaciones_legales` (`usuario_id`, `documento`, `version`, `aceptado_en`, `version_app`) con
índice único por cuenta, documento y versión. Las aceptaciones se insertan con `ON CONFLICT DO
NOTHING`, lo que resuelve repetición y concurrencia. Un booleano no prueba qué texto se aceptó ni
sobrevive a un cambio de versión.

### Documentos en la API, no en el APK

Los textos viven en `apps/api/src/legal/` como módulos versionados y se publican en
`GET /legal/documents`. El móvil los pide y envía las versiones que mostró. Alternativa descartada:
incluirlos en el APK, porque sin actualización forzada no se podría garantizar el texto vigente, y
una tabla de documentos requeriría una interfaz de edición que nadie pidió. Publicar una versión
nueva requiere desplegar la API.

### Contratos de la API

- `POST /auth/mobile/register` añade `birthDate` obligatorio, `acceptedLegal: { terms, privacy }` y
  `appVersion` opcional. Versión desactualizada: `409` con código `LEGAL_VERSION_OUTDATED`. Menor de
  edad: `400` con código `UNDERAGE`, que el móvil traduce.
- `POST /auth/legal-acceptances`, autenticado, con las mismas versiones y resultado idempotente.
- El perfil de sesión añade `pendingLegalDocuments`, calculado en login, refresh y consulta de sesión.
- `POST /auth/account/delete`, autenticado, con `password`. Se usa `POST` porque lleva cuerpo.

### Reaceptación solo en clientes nuevos

La API no bloquea a las cuentas con pendientes: bloquearlas dejaría sin servicio a quien tiene un APK
antiguo, que no puede aceptar. La pantalla de bloqueo vive en el móvil y se evalúa con el perfil de
sesión. Implica que un APK antiguo sigue usando la cuenta sin aceptar hasta que actualice.

### Eliminación por anonimización

Borrar la fila no es viable por las FK `RESTRICT`. En una transacción con `SELECT ... FOR UPDATE`
sobre la cuenta: se borran los datos dependientes, se marcan y vacían las opiniones y sus versiones,
y la fila queda con `eliminado_at`, `activo = FALSE`, datos personales nulos o neutros, y un hash de
contraseña inutilizable. `email` pasa a un valor no enrutable único para respetar el índice de
`lower(email)` y liberar el correo. Se añade `eliminado_at` a `usuarios`; hay que revisar qué columnas
aceptan `NULL` y si requieren migración. Una segunda solicitud falla al no encontrar una cuenta activa.

Solo aplica a cuentas cuyo único rol es `TURISTA`, lo que evita romper auditorías institucionales.

### Interfaz móvil

- **Registro**: usuario que crea su cuenta; decide si acepta; necesita el acceso a cada documento; la
  acción principal es «Crear cuenta». Se añade `TourismCheckbox`, con objetivo táctil de 48 dp, en
  `tourism-fields.tsx`, y se reutiliza el `Zod` de `auth-forms.ts`.
- **Documentos**: ruta `legal/[document]`, con estados de carga, error y contenido.
- **Reaceptación**: pantalla sobre la sesión, con aceptar y cerrar sesión. Atrás no la salta.
- **Eliminación**: botón en el perfil, hoja con la explicación y campo de contraseña.

## Risks / Trade-offs

- **APK antiguos** → no podrán registrarse y verán «datos no válidos». Se acepta, porque registrar
  sin consentimiento es peor; conviene publicar el APK el mismo día.
- **Orden de despliegue** → un APK nuevo contra una API antigua falla con `400`. Se despliega primero
  la API.
- **Consentimiento agrupado** → el agente queda cubierto por la política general, no por un
  consentimiento propio. Debe validarlo el área jurídica frente al art. 60 de la LOPDP.
- **Eliminación irreversible** → se exige contraseña y confirmación, y se prueba contra una base local
  con datos en todas las tablas relacionadas. No hay restauración.
- **Tablas futuras** → una tabla nueva con FK a `usuarios` podría quedar fuera de la eliminación. Una
  prueba de integración debe recorrer las FK reales.

## Open Questions

- Correo institucional para ejercer derechos: lo entregará el equipo más adelante. No cambia lo que
  se construye, pero bloquea publicar los documentos.

Domicilio y teléfono confirmados por el equipo: `Av. Ernesto Che Guevara y Gabriel Secaira, Guaranda`
y `(593) 3220 6010`.
