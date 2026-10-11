# Spec Delta

## Purpose

Describir la navegación turística móvil y la disponibilidad de ubicación sin
convertir el menú, los overlays o las funciones institucionales en pestañas nuevas.

## ADDED Requirements

### Requirement: Destinos turísticos principales

El móvil SHALL ofrecer Explorar y Guardados como pestañas; Menú abre una hoja y los cambios de pestaña no acumulan entradas en el historial.

#### Scenario: Cambio de pestaña

- **WHEN** el usuario cambia entre Explorar y Guardados con una sesión adecuada al destino
- **THEN** cambia el destino seleccionado sin añadir una entrada por cada pulsación

#### Scenario: Abrir menú

- **WHEN** el usuario pulsa Menú
- **THEN** se abre su hoja con perfil, mapas sin conexión y configuración

### Requirement: Acceso móvil protegido y retorno

El móvil SHALL redirigir al login con destino de retorno cuando un visitante anónimo abre Guardados, Perfil o Mapas sin conexión y esperar durante la restauración de sesión.

#### Scenario: Visitante anónimo

- **WHEN** el visitante abre Guardados
- **THEN** se muestra el login conservando Guardados como destino posterior

#### Scenario: Restauración pendiente

- **WHEN** todavía se está restaurando la sesión y se abre un destino protegido
- **THEN** el destino espera su resolución sin interpretar ese estado como anonimato confirmado

### Requirement: Ubicación contextual y disponibilidad

El móvil SHALL solicitar ubicación en los flujos que la usan, distinguir permiso, disponibilidad y precisión, y permitir explorar contenido turístico cuando la ubicación no está disponible.

#### Scenario: Permiso denegado

- **WHEN** el usuario deniega ubicación
- **THEN** el móvil conserva la exploración turística y comunica la limitación del flujo que requería posición

#### Scenario: Posición insuficiente

- **WHEN** una posición no alcanza la calidad requerida para el seguimiento activo
- **THEN** el móvil informa ese estado sin tratarla como una posición fiable de navegación

### Requirement: Ciclo de seguimiento de posición

El móvil SHALL retirar las suscripciones de posición al detener el seguimiento correspondiente y evitar aplicar una suscripción tardía a una sesión ya cerrada.

#### Scenario: Seguimiento detenido

- **WHEN** termina la sesión de seguimiento que abrió una suscripción
- **THEN** se elimina esa suscripción y deja de actualizar la posición de esa sesión
