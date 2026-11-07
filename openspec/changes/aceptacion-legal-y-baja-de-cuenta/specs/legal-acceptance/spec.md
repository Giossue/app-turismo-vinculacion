# Spec Delta

## Purpose

Definir cómo se publican los documentos legales de la app, cómo una cuenta turística los acepta y
qué constancia queda de esa aceptación para la institución.

## ADDED Requirements

### Requirement: Documentos legales vigentes

La API SHALL publicar sin autenticación la versión vigente de «Términos y condiciones» y de
«Política de privacidad», con su tipo, versión, título, fecha y contenido. La política MUST
identificar a la Universidad Estatal de Bolívar como responsable e informar lo exigido por el
artículo 12 de la LOPDP, incluido el tratamiento con inteligencia artificial y las transferencias
a proveedores en el exterior.

#### Scenario: Consulta sin sesión

- **WHEN** una persona sin cuenta abre un documento desde el registro
- **THEN** la app muestra el texto vigente sin pedir inicio de sesión

#### Scenario: Documentos no disponibles

- **WHEN** la app no puede obtener los documentos por falta de conexión o error del servidor
- **THEN** muestra un estado de error con opción de reintentar
- **AND** no permite enviar la aceptación

### Requirement: Aceptación obligatoria en el registro

La API SHALL crear una cuenta turística solo si la solicitud declara la aceptación de la versión
vigente de ambos documentos. La cuenta y sus constancias MUST crearse en la misma transacción. La
app MUST mantener deshabilitado «Crear cuenta» hasta que ambas casillas estén marcadas y MUST NOT
marcarlas por defecto.

#### Scenario: Registro con ambas aceptaciones

- **WHEN** una persona marca ambas casillas y envía datos válidos
- **THEN** se crea la cuenta
- **AND** queda una constancia por documento con su versión

#### Scenario: Falta una aceptación

- **WHEN** una solicitud a la API omite la aceptación de un documento
- **THEN** la API responde con error de validación
- **AND** no crea la cuenta ni constancias

#### Scenario: Versión desactualizada

- **WHEN** la solicitud declara una versión que ya no es la vigente
- **THEN** la API responde con conflicto y no crea la cuenta
- **AND** la app vuelve a cargar los documentos y pide aceptar de nuevo

#### Scenario: Fallo al guardar la constancia

- **WHEN** la constancia no se puede guardar
- **THEN** la cuenta tampoco se crea

### Requirement: Edad mínima para registrarse

La API SHALL exigir la fecha de nacimiento en el registro y rechazar a quien tenga menos de 15 años
en la fecha del servidor. La app MUST explicar el motivo sin crear la cuenta.

#### Scenario: Menor de 15 años

- **WHEN** la fecha de nacimiento indica menos de 15 años
- **THEN** la API rechaza el registro y la app muestra el motivo

#### Scenario: Cumple 15 años ese día

- **WHEN** la persona cumple 15 años en la fecha del registro
- **THEN** la API acepta la fecha de nacimiento

#### Scenario: Sin fecha de nacimiento

- **WHEN** una solicitud a la API omite la fecha de nacimiento
- **THEN** la API responde con error de validación

### Requirement: Constancia de aceptación

El sistema SHALL guardar por cada aceptación la cuenta, el documento, la versión, la hora del
servidor y la versión de la app declarada. Las constancias MUST NOT modificarse ni borrarse desde la
API, y la hora MUST NOT provenir del cliente. Una cuenta sin constancia MUST considerarse sin
aceptación; el sistema MUST NOT crear constancias retroactivas.

#### Scenario: Cuenta anterior a este cambio

- **WHEN** se aplica la migración sobre cuentas existentes
- **THEN** esas cuentas quedan sin constancias

#### Scenario: Cambio de versión

- **WHEN** una cuenta acepta una versión nueva
- **THEN** se agrega una constancia y se conserva la anterior

### Requirement: Reaceptación de cuentas turísticas

La API SHALL informar en el perfil de sesión qué documentos vigentes no ha aceptado una cuenta
turística. Mientras haya pendientes, la app MUST bloquear el uso de la sesión con una pantalla que
permita aceptar o cerrar sesión. Las cuentas institucionales MUST NOT recibir documentos pendientes.

#### Scenario: Cuenta existente inicia sesión

- **WHEN** una cuenta turística sin constancias inicia sesión
- **THEN** la app muestra los documentos pendientes antes de continuar

#### Scenario: Acepta los pendientes

- **WHEN** la persona acepta los documentos pendientes
- **THEN** se guardan las constancias y la app continúa con su sesión

#### Scenario: No acepta

- **WHEN** la persona elige cerrar sesión
- **THEN** la sesión termina, no se guarda constancia y puede seguir como invitada

#### Scenario: Aceptación repetida

- **WHEN** la misma cuenta envía dos veces la misma aceptación, incluso a la vez
- **THEN** queda una sola constancia por documento y versión y ambas solicitudes terminan bien

#### Scenario: Aceptación sin sesión

- **WHEN** una solicitud de aceptación no aporta un token válido
- **THEN** la API responde como no autenticada

#### Scenario: Sesión restaurada sin conexión

- **WHEN** la app restaura una sesión sin conexión
- **THEN** usa el último estado conocido y vuelve a evaluar al recuperar la conexión

### Requirement: Consulta institucional de aceptaciones

El listado de usuarios del panel SHALL mostrar para cada cuenta turística si aceptó las versiones
vigentes, con versión y fecha de la última aceptación. Solo los roles que hoy consultan usuarios MUST
acceder a este dato.

#### Scenario: Administrador consulta usuarios

- **WHEN** un rol autorizado abre el listado de usuarios
- **THEN** ve el estado de aceptación de cada cuenta turística

#### Scenario: Rol sin acceso

- **WHEN** un rol sin acceso al listado consulta ese recurso
- **THEN** la API lo rechaza sin revelar datos de aceptación
