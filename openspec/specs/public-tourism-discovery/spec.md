# public-tourism-discovery Specification

## Purpose

Describir la consulta pública de información turística visible, sus filtros y
las referencias que el móvil usa para explorar y abrir fichas.

## Requirements

### Requirement: Centros públicos visibles

La API SHALL entregar en el descubrimiento público únicamente centros publicados, activos y no eliminados.

#### Scenario: Ficha publicada

- **WHEN** se consulta el código de un centro visible
- **THEN** la API devuelve su ficha pública

#### Scenario: Ficha no visible

- **WHEN** el código corresponde a un centro no publicado, desactivado, eliminado o inexistente
- **THEN** la consulta pública no entrega la ficha y responde como no encontrada

### Requirement: Filtros y paginación de centros

La API SHALL validar filtros textuales, territoriales y espaciales y devolver centros con total, límite y desplazamiento de la página.

#### Scenario: Página válida

- **WHEN** el consumidor solicita una página con filtros válidos
- **THEN** recibe elementos filtrados y metadatos coherentes con limit y offset

#### Scenario: Caja espacial incompleta

- **WHEN** se envían límites espaciales incompletos o inválidos
- **THEN** la API rechaza la consulta sin interpretar silenciosamente otra cobertura

### Requirement: Búsqueda pública heterogénea

La API SHALL permitir buscar centros publicados, establecimientos y referencias geográficas, conservando el tipo y referencia de cada resultado; la distancia opcional es en línea recta.

#### Scenario: Búsqueda con posición

- **WHEN** se envía texto válido y un par válido de coordenadas
- **THEN** los resultados incluyen sus referencias y la cercanía participa en su orden, sin presentar la distancia como ruta navegable

### Requirement: Catálogos de descubrimiento

La API SHALL exponer catálogos públicos de filtros para que el consumidor use referencias del dominio vigente.

#### Scenario: Obtener filtros

- **WHEN** el móvil consulta los catálogos de descubrimiento
- **THEN** recibe opciones del catálogo público sin necesitar sesión institucional
