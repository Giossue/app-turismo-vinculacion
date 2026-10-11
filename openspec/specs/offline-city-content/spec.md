# offline-city-content Specification

## Purpose

Describir el catálogo y los manifiestos de ciudad que permiten al consumidor
nativo conservar contenido turístico público para su consulta sin conexión.

## Requirements

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

### Requirement: Lecturas locales proporcionadas a la consulta

El móvil SHALL consultar metadatos de ciudades y fichas individuales sin hidratar rutas, estilos y lugares de todos los paquetes; el contenido completo solo se carga para la consulta que lo necesita, manteniendo compatibilidad con descargas existentes.

#### Scenario: Abrir catálogo o ficha local

- **WHEN** se listan ciudades descargadas o se solicita un centro individual
- **THEN** se reciben únicamente los metadatos o centros necesarios con validación

#### Scenario: Consulta espacial con límites antiguos ausentes

- **WHEN** una descarga anterior no tiene límites de cobertura completos
- **THEN** no se excluye silenciosamente de los candidatos locales

### Requirement: Búsqueda local con preparación reutilizable

El móvil SHALL reutilizar documentos normalizados y un índice local por paquete, conservar relevancia, sinónimos, coincidencias aproximadas, orden y cobertura, y liberar el índice cuando se libera su contenido.

#### Scenario: Varias consultas sobre una descarga

- **WHEN** se cambia el texto sin cambiar el paquete descargado
- **THEN** se reutiliza su preparación y se conservan las coincidencias admitidas

#### Scenario: Cambiar o borrar descarga

- **WHEN** se actualiza o elimina un paquete
- **THEN** se invalidan las lecturas locales sin seguir buscando en su índice anterior
