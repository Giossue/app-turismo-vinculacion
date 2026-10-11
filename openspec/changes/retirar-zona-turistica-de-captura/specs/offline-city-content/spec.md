## MODIFIED Requirements

### Requirement: Catálogo y manifiesto público de ciudad

La API SHALL exponer ciudades y disponibilidad de paquete y entregar manifiestos
con cobertura, versión y contenido turístico público; SHALL seleccionar los
atractivos por sus coordenadas dentro del área descargable sin exigir una zona
turística asignada en la captura institucional.

#### Scenario: Atractivo sin zona

- **WHEN** un atractivo activo y publicado tiene coordenadas dentro de la cobertura
- **THEN** aparece en el manifiesto aunque no tenga una zona turística asignada
- **AND** ese contenido permite ofrecer la ciudad como descargable

#### Scenario: Fuera de cobertura o no publicado

- **WHEN** un atractivo está fuera del área, inactivo o sin publicación aprobada
- **THEN** no se incluye aunque conserve una zona relacionada con esa ciudad

#### Scenario: Ruta de centros del área

- **WHEN** una ruta publicada se asocia a centros públicos de la cobertura
- **THEN** se incluye una sola versión publicada de esa ruta aunque los centros no tengan zona

#### Scenario: Actualización de ubicación o publicación

- **WHEN** cambia la ubicación de un centro o se retira su publicación
- **THEN** la versión anuncia contenido actualizado sin retroceder al desaparecer de la cobertura

#### Scenario: Descarga anterior

- **WHEN** existe una descarga anterior a la selección geográfica
- **THEN** sigue siendo legible y la API ofrece una versión superior para actualizarla
