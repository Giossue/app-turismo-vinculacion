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

El móvil nativo SHALL conservar el token de renovación en almacenamiento protegido, renovar mediante el contrato móvil y eliminar la sesión local al cerrar sesión.

#### Scenario: Restauración de sesión

- **WHEN** existe una sesión local renovable y la API acepta su renovación
- **THEN** el móvil restaura la identidad y el nuevo acceso

#### Scenario: Cierre local

- **WHEN** la cuenta cierra sesión
- **THEN** se elimina la sesión persistida y el consumidor deja de usar sus credenciales anteriores
