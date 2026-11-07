# Proposal

## Why

Hoy una persona crea su cuenta sin términos ni política de privacidad, y no queda constancia de
ninguna aceptación. La Ley Orgánica de Protección de Datos Personales exige informar antes de
recoger los datos (art. 12), un consentimiento que se pueda revocar de forma sencilla (art. 8) y
el derecho de eliminación (art. 15). La Resolución SPDP-SPD-2026-0009-R exige además informar el
tratamiento con inteligencia artificial y su carácter automatizado. La app no ofrece ninguna forma
de eliminar la cuenta, aunque `docs/security/privacy-location.md` lo promete.

## What Changes

- Publicar dos documentos versionados: «Términos y condiciones» y «Política de privacidad», con la
  Universidad Estatal de Bolívar como responsable del tratamiento.
- **BREAKING**: el registro exige aceptar ambos documentos en su versión vigente. Los APK publicados
  no envían esa aceptación y dejarán de poder crear cuentas; iniciar sesión les sigue funcionando.
- **BREAKING**: el registro exige la fecha de nacimiento en la API y rechaza a menores de 15 años.
- Guardar una constancia por documento aceptado, con versión y hora del servidor.
- Pedir la aceptación a las cuentas turísticas existentes, y a todas cuando cambie una versión.
- Mostrar en el panel institucional si cada cuenta aceptó, qué versión y cuándo.
- Permitir que una cuenta turística elimine su cuenta desde la app, confirmando su contraseña.

Fuera de alcance:

- La evaluación de impacto, el registro de actividades de tratamiento y la designación de un
  delegado de protección de datos, que son obligaciones institucionales de la universidad.
- La traducción al inglés de los documentos: el texto vinculante es el español.
- La exportación de datos y un consentimiento separado para el agente.
- Bloquear en la API a las sesiones de APK antiguos que no aceptaron.

## Capabilities

### New Capabilities

- `legal-acceptance`: documentos legales versionados, aceptación obligatoria, constancia y
  reaceptación de cuentas turísticas.
- `account-deletion`: eliminación de la cuenta turística por su titular y efecto sobre sus datos.

### Modified Capabilities

Ninguna: `identity-and-record-access` no define hoy el registro de cuentas turísticas.

## Impact

- **Base de datos**: tabla nueva y marca de eliminación en `usuarios`; requiere migración en producción.
- **API**: `POST /auth/mobile/register` cambia su contrato; endpoints nuevos para documentos,
  aceptación y eliminación; el perfil de sesión añade los documentos pendientes.
- **Móvil**: registro, pantalla de documentos, bloqueo de reaceptación y eliminación en el perfil.
- **Panel `web-turismo-admin`**: columna de aceptación en usuarios.
- **Despliegue**: migración, luego API, luego panel y APK. Un APK nuevo contra una API antigua
  recibiría `400`, porque la API rechaza campos no declarados.
- **Dependencias externas**: revisión jurídica de la universidad y correo institucional de contacto.
