## ADDED Requirements

### Requirement: Listas móviles con montaje acotado

El móvil SHALL virtualizar resultados, guardados y ciudades; las opiniones dentro de una ficha mostrarán como máximo veinte filas por página sin eliminar resultados, borradores ni acciones existentes.

#### Scenario: Lista extensa

- **WHEN** se abre una colección extensa y se desplaza
- **THEN** se monta una ventana de filas y todos los elementos siguen accesibles

#### Scenario: Avanzar opiniones

- **WHEN** se avanza a otra página o se vuelve a la anterior
- **THEN** se presentan sus opiniones sin montar simultáneamente todas las páginas ni borrar el borrador
