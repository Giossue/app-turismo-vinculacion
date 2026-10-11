## ADDED Requirements

### Requirement: Conservación con estado sin confirmar

La API SHALL permitir publicar una ficha autorizada con estado de conservación
desconocido en un componente, conservarlo como NULL junto con sus factores y
observaciones, y leerlo sin inventar un estado ni perder datos. SHALL asignar
cero puntos al estado desconocido y conservar las validaciones de los factores.

#### Scenario: Entorno sin estado con factores

- **WHEN** se aprueba una ficha válida con atractivo Alterado, entorno nulo y factores catalogados en ambos componentes
- **THEN** la ausencia del estado del entorno no bloquea la aprobación
- **AND** ambos componentes conservan sus factores y observaciones al leer la publicación
- **AND** la conservación suma cinco puntos del atractivo y cero del entorno

#### Scenario: Factores sin evaluación previa en el contenido

- **WHEN** un componente válido tiene factores válidos y su estado no está informado
- **THEN** se conserva una evaluación del componente con estado NULL
- **AND** los factores no se omiten ni se asocian a otro componente

#### Scenario: Progreso con desconocido explícito

- **WHEN** ambos componentes registran un estado conocido o explícitamente nulo
- **THEN** el apartado puede mostrarse completo sin convertir el desconocido en un estado conocido

#### Scenario: Referencia inválida o cuenta sin acceso

- **WHEN** hay estados conocidos inactivos, factores inválidos, duplicados o una cuenta sin permiso para aprobar
- **THEN** se conserva el rechazo correspondiente sin publicar datos parciales
