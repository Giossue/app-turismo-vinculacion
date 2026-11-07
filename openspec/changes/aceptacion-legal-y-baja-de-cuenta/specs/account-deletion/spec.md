# Spec Delta

## Purpose

Definir cómo una persona elimina su cuenta turística desde la app, qué ocurre con sus datos y qué
se conserva como constancia.

## ADDED Requirements

### Requirement: Eliminación de la cuenta por su titular

La API SHALL permitir que una cuenta turística autenticada elimine su propia cuenta confirmando su
contraseña. La app MUST ofrecerlo desde el perfil, explicar qué se elimina y pedir confirmación
antes de enviarlo. La operación MUST ser gratuita y no exigir justificación.

#### Scenario: Eliminación confirmada

- **WHEN** la persona confirma con su contraseña correcta
- **THEN** la cuenta queda eliminada y sus sesiones se revocan
- **AND** la app borra la sesión local y continúa como invitada

#### Scenario: Contraseña incorrecta

- **WHEN** la contraseña no coincide
- **THEN** la API rechaza la solicitud y la cuenta no cambia

#### Scenario: Sin sesión

- **WHEN** la solicitud no aporta un token válido
- **THEN** la API responde como no autenticada

#### Scenario: Cuenta institucional

- **WHEN** una cuenta con rol institucional intenta eliminarse por esta vía
- **THEN** la API la rechaza y la cuenta no cambia

#### Scenario: La persona cancela

- **WHEN** la persona cancela en la confirmación
- **THEN** no se envía ninguna solicitud

#### Scenario: Error de red

- **WHEN** la solicitud falla por conexión o error del servidor
- **THEN** la app informa el error y conserva la sesión

#### Scenario: Solicitud repetida

- **WHEN** llegan dos solicitudes válidas a la vez
- **THEN** la cuenta se elimina una sola vez y la segunda no produce otro efecto

### Requirement: Efecto sobre los datos de la cuenta

La eliminación SHALL ser atómica. MUST borrar nombre, correo, género, fecha de nacimiento y
contraseña de la cuenta, y MUST borrar sus favoritos, itinerarios, historial y turnos del agente,
y sesiones. Sus opiniones MUST dejar de mostrarse y su texto MUST borrarse, incluidas las versiones
anteriores. La cuenta MUST NOT poder iniciar sesión ni renovar sesiones. Las constancias de
aceptación MUST conservarse, sin datos personales adicionales, como prueba del consentimiento.

#### Scenario: Después de eliminar

- **WHEN** termina la eliminación
- **THEN** ningún dato identificable de la persona queda en la cuenta
- **AND** sus constancias de aceptación se conservan

#### Scenario: Fallo parcial

- **WHEN** falla alguno de los pasos de la eliminación
- **THEN** no se aplica ningún cambio

#### Scenario: Registro posterior con el mismo correo

- **WHEN** la persona se registra de nuevo con ese correo
- **THEN** se crea una cuenta nueva sin relación con la eliminada

#### Scenario: Sesión ya emitida

- **WHEN** una sesión previa intenta renovarse después de la eliminación
- **THEN** la API la rechaza

#### Scenario: Calificación pública

- **WHEN** se elimina una cuenta con opiniones aprobadas
- **THEN** esas opiniones dejan de contar en las calificaciones públicas
