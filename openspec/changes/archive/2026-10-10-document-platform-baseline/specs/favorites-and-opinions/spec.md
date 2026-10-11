# Spec Delta

## Purpose

Describir las colecciones personales y opiniones turísticas de la cuenta
autenticada, con separación entre propuestas, versiones públicas y moderación.

## ADDED Requirements

### Requirement: Favoritos propios autenticados

La API SHALL permitir a TURISTA y ADMINISTRADOR consultar y modificar sus propios favoritos de centros y establecimientos usando la identidad de la sesión.

#### Scenario: Colección personal

- **WHEN** una cuenta autorizada solicita sus favoritos
- **THEN** recibe su colección sin acceder a favoritos de otras cuentas

#### Scenario: Visitante sin sesión

- **WHEN** una solicitud de favoritos no tiene una sesión válida
- **THEN** la API responde como no autenticada

### Requirement: Repetición de guardado de favorito

La API SHALL mantener un solo favorito por cuenta y destino al repetir su guardado y limitar la eliminación a la relación de esa cuenta.

#### Scenario: Guardar otra vez

- **WHEN** la cuenta guarda nuevamente un destino ya favorito
- **THEN** no se crea una segunda relación de favorito para ese destino

### Requirement: Opinión propia versionada

La API SHALL asociar la creación, consulta privada y edición de una opinión a la cuenta autenticada y conservar las propuestas como versiones sujetas a moderación.

#### Scenario: Editar una opinión aprobada

- **WHEN** la cuenta presenta una edición válida de su opinión que admite nueva propuesta
- **THEN** se conserva la versión publicada y la nueva versión queda pendiente de moderación

#### Scenario: Consultar opinión propia

- **WHEN** una cuenta consulta su opinión de un centro
- **THEN** la API usa su identidad y no permite seleccionar la identidad de otra cuenta

### Requirement: Moderación y exposición pública de opiniones

La API SHALL reservar revisión, historial y eliminación institucional a ADMINISTRADOR y entregar públicamente las versiones publicadas admitidas por la visibilidad del centro.

#### Scenario: Propuesta pendiente

- **WHEN** un visitante consulta las opiniones públicas de un centro visible
- **THEN** la API no entrega como publicada una propuesta pendiente

#### Scenario: Moderador sin rol

- **WHEN** una cuenta sin rol ADMINISTRADOR intenta decidir la moderación
- **THEN** la API rechaza la operación por permisos insuficientes
