# Spec Delta

## Purpose

Describir el agente turístico autenticado que responde con texto, referencias y
acciones propuestas y permite al móvil consumir una respuesta progresiva.

## ADDED Requirements

### Requirement: Acceso y entrada del chat

La API SHALL limitar el chat a TURISTA o ADMINISTRADOR autenticados y validar mensaje, contexto acotado y ubicación opcional antes de consultar al proveedor.

#### Scenario: Entrada válida

- **WHEN** una cuenta autorizada envía un mensaje y contexto válidos
- **THEN** la API procesa la conversación turística

#### Scenario: Cuenta sin acceso

- **WHEN** una cuenta sin rol admitido solicita el chat
- **THEN** la API rechaza la operación por permisos insuficientes

#### Scenario: Entrada inválida

- **WHEN** el mensaje, contexto o coordenadas incumplen el contrato
- **THEN** la API rechaza la solicitud antes de generar la respuesta

### Requirement: Respuesta turística estructurada

La API SHALL entregar texto, tarjetas, acciones propuestas y fuentes conforme al contrato del agente; el consumidor requiere una acción del usuario para abrir fichas o iniciar navegación.

#### Scenario: Recomendación con referencias

- **WHEN** el agente produce una recomendación válida
- **THEN** el móvil puede representar las tarjetas y permitir consultar sus referencias o actuar sobre ellas

### Requirement: Streaming y cierre de conexión

La API SHALL ofrecer eventos de texto parcial y respuesta completa mediante streaming y cancelar el trabajo asociado cuando el cliente cierra una conexión todavía activa.

#### Scenario: Finalización

- **WHEN** el proveedor completa una respuesta válida con la conexión abierta
- **THEN** el cliente recibe la respuesta estructurada final y el cierre del stream

#### Scenario: Fallo del proveedor

- **WHEN** ocurre un fallo durante un stream todavía abierto
- **THEN** la API emite un error de disponibilidad y cierra el stream

#### Scenario: Cancelación del cliente

- **WHEN** el cliente cierra el stream antes de finalizar
- **THEN** la API activa la cancelación y deja de emitir eventos a esa conexión
