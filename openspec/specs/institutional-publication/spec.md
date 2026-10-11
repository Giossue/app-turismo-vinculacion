# institutional-publication Specification

## Purpose

Describir la captura y revisión institucional de centros en la API, preservando
la ficha pública durante la edición y separando publicación de activación.

## Requirements

### Requirement: Borrador separado de la ficha publicada

La API SHALL conservar las propuestas de edición separadas de la ficha pública y rechazar la edición incompatible con el estado de revisión.

#### Scenario: Cambios aún no aprobados

- **WHEN** una cuenta autorizada guarda una propuesta para un centro publicado
- **THEN** la propuesta queda pendiente del flujo de revisión y la ficha pública conserva la versión publicada

#### Scenario: Edición durante revisión

- **WHEN** se intenta guardar una ficha cuyo borrador está en revisión
- **THEN** la API comunica el conflicto de estado sin aplicar esa edición

### Requirement: Conflicto de versión suministrada

La API SHALL rechazar un guardado que aporte una versión de borrador distinta de la versión vigente, cuando ya existe un borrador.

#### Scenario: Edición concurrente

- **WHEN** otra edición ha avanzado el borrador y el consumidor envía la versión anterior
- **THEN** la API responde con conflicto y solicita recargar antes de guardar

### Requirement: Decisión de revisión del administrador

La API SHALL reservar la decisión a ADMINISTRADOR, exigir motivo al rechazar y publicar los datos aprobados con su multimedia pendiente y auditoría dentro de la transacción de revisión.

#### Scenario: Aprobación vigente

- **WHEN** el administrador aprueba una revisión vigente cuyos datos son válidos y completos
- **THEN** se publican sus datos, se actualiza el estado y se registra la decisión y publicación

#### Scenario: Rechazo sin motivo

- **WHEN** el administrador intenta rechazar sin motivo
- **THEN** la API rechaza la decisión sin cambiar la revisión

#### Scenario: Decisión repetida

- **WHEN** se intenta resolver una revisión que ya no está en revisión
- **THEN** la API informa conflicto sin aplicar una nueva decisión

### Requirement: Compatibilidad de publicación y activación

La API SHALL reconocer una publicación ya aprobada mediante el endpoint legado sin duplicar su auditoría y mantener la activación como decisión administrativa independiente.

#### Scenario: Repetición del endpoint legado

- **WHEN** se solicita publicar un centro cuya ficha y borrador ya están publicados
- **THEN** se confirma el resultado existente sin crear otra publicación

#### Scenario: Desactivación

- **WHEN** el administrador desactiva un centro publicado
- **THEN** deja de exponerse como centro público visible y conserva su estado de revisión
