# Spec Delta

## Purpose

Describir el catálogo y los manifiestos de ciudad que permiten al consumidor
nativo conservar contenido turístico público para su consulta sin conexión.

## ADDED Requirements

### Requirement: Catálogo y manifiesto público de ciudad

La API SHALL exponer ciudades y disponibilidad de paquete y entregar manifiestos publicados con cobertura, versión y contenido turístico público de la ciudad.

#### Scenario: Paquete publicado

- **WHEN** el consumidor solicita el manifiesto de una ciudad con paquete publicado y zona definida
- **THEN** recibe cobertura, versión, atractivos, catastros, POIs y rutas publicados

### Requirement: Disponibilidad explícita del paquete

La API SHALL distinguir una ciudad sin paquete publicado de un paquete cuya zona de descarga no está disponible.

#### Scenario: Paquete inexistente

- **WHEN** la ciudad solicitada no tiene un paquete publicado
- **THEN** la API responde como no encontrado

#### Scenario: Zona no definida

- **WHEN** el paquete carece de una zona de descarga disponible
- **THEN** la API responde con indisponibilidad y no fabrica una cobertura

### Requirement: Persistencia local versionada

El móvil nativo SHALL conservar manifiestos por ciudad con su versión y permitir consultarlos y eliminarlos localmente sin depender de una nueva respuesta de la API.

#### Scenario: Consultar contenido conservado

- **WHEN** existe un manifiesto válido almacenado para la ciudad y no hay conectividad
- **THEN** el móvil puede recuperar ese contenido local con su versión

#### Scenario: Eliminar manifiesto

- **WHEN** el usuario elimina el contenido local de la ciudad
- **THEN** su manifiesto deja de estar disponible como contenido conservado
