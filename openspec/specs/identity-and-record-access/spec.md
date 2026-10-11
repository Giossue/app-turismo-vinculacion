# identity-and-record-access Specification

## Purpose

Describir la identidad y las fronteras de acceso que comparten el móvil turístico
y el panel institucional a través de la API existente.

## Requirements

### Requirement: Sesión autenticada para recursos privados

La API SHALL exigir un access token válido en las operaciones protegidas y permitir consultar la cuenta activa mediante el recurso de sesión.

#### Scenario: Token válido

- **WHEN** una cuenta activa consulta su sesión con un token válido
- **THEN** recibe su perfil y roles actuales

#### Scenario: Token ausente o inválido

- **WHEN** una solicitud protegida no aporta un token válido
- **THEN** la API responde como no autenticada

### Requirement: Roles por operación institucional

La API SHALL exigir los roles declarados por cada operación institucional; conocer una URL o identificador no concede un rol.

#### Scenario: Cuenta turística intenta moderar

- **WHEN** una cuenta con rol TURISTA solicita una operación exclusiva de ADMINISTRADOR
- **THEN** la API rechaza la operación por permisos insuficientes

### Requirement: Alcance de centros del agente turístico

La API SHALL limitar el acceso de AGENTE_TURISTICO a los centros de su responsabilidad y conservar las restricciones de edición por estado.

#### Scenario: Referencia de otro responsable

- **WHEN** un agente consulta o intenta editar un centro fuera de su responsabilidad
- **THEN** la API no entrega el registro privado ni aplica la modificación

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
