## ADDED Requirements

### Requirement: Idioma de la interfaz

El móvil SHALL mostrar su interfaz en español o inglés según el idioma del dispositivo o la elección guardada en Configuración, con español como respaldo.

#### Scenario: Teléfono en inglés

- **WHEN** la persona abre la app por primera vez con el teléfono en inglés
- **THEN** pantallas, botones, avisos y etiquetas de accesibilidad aparecen en inglés

#### Scenario: Idioma no admitido

- **WHEN** ningún idioma del dispositivo es español ni inglés
- **THEN** la interfaz se muestra en español

#### Scenario: Cambio en Configuración

- **WHEN** la persona elige «English» en Configuración
- **THEN** la interfaz cambia a inglés sin reiniciar y la elección se conserva al volver a abrir la app

### Requirement: Navegación en el idioma activo

El móvil SHALL dar las indicaciones, la voz y las notificaciones de navegación en el idioma de la interfaz.

#### Scenario: Indicaciones en inglés

- **WHEN** la interfaz está en inglés y se navega una ruta
- **THEN** cada paso se muestra y se anuncia en inglés con la voz `en-US`

#### Scenario: Llegada en segundo plano

- **WHEN** la persona llega con la app oculta y la interfaz en inglés
- **THEN** la notificación de llegada está en inglés

### Requirement: Contenido publicado sin traducir

El móvil SHALL mostrar el contenido publicado tal como lo entrega la API y traducir solo los textos propios de la app.

#### Scenario: Ficha en inglés

- **WHEN** la interfaz está en inglés y se abre una ficha
- **THEN** los títulos de sección están en inglés y el nombre y la descripción del lugar se muestran como fueron publicados

#### Scenario: Error redactado por la API

- **WHEN** la interfaz está en inglés y la API rechaza un inicio de sesión con su mensaje en español
- **THEN** se muestra un mensaje en inglés según el estado HTTP

### Requirement: Agente en el idioma activo

El móvil SHALL indicar al agente el idioma de la interfaz cuando es inglés.

#### Scenario: Pregunta en inglés

- **WHEN** la interfaz está en inglés y la persona pregunta al agente
- **THEN** la petición incluye `language: "en"` y el agente responde en inglés salvo que se le pida español
