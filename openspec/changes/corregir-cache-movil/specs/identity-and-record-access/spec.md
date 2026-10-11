# Spec Delta

## MODIFIED Requirements

### Requirement: Renovación y cierre de sesión móvil

El móvil nativo SHALL conservar el token de renovación en almacenamiento protegido, coordinar su renovación y eliminar la sesión local al cerrar sesión, sin que resultados anteriores puedan restaurarla.

#### Scenario: Restauración de sesión

- **WHEN** existe una sesión local renovable y la API acepta su renovación
- **THEN** el móvil restaura la identidad y el nuevo acceso

#### Scenario: Cierre local

- **WHEN** la cuenta cierra sesión
- **THEN** se elimina la sesión persistida y el consumidor deja de usar sus credenciales anteriores
- **AND** el acceso local se invalida antes de esperar la revocación remota

#### Scenario: Renovación pendiente al cerrar sesión

- **WHEN** termina una renovación iniciada antes del cierre local
- **THEN** su resultado no restaura tokens, perfil ni datos privados

#### Scenario: Solicitud anterior a un cambio de cuenta

- **WHEN** una solicitud de la cuenta anterior termina después de iniciar otra sesión
- **THEN** su resultado se descarta y no se repite con las credenciales de la nueva cuenta

#### Scenario: Renovación concurrente

- **WHEN** varias solicitudes de la misma sesión requieren renovar su acceso
- **THEN** comparten una renovación y cada solicitud se repite como máximo una vez tras un rechazo por token vencido

#### Scenario: Restauración sin conexión

- **WHEN** la API no está disponible y existe un perfil local de la sesión renovable
- **THEN** el móvil conserva ese perfil para el uso sin conexión y vuelve a intentar la renovación al necesitar acceso remoto
- **AND** un rechazo de sesión de la API elimina el acceso local
