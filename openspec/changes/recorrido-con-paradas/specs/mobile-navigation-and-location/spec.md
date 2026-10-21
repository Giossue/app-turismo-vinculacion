## ADDED Requirements

### Requirement: Recorrido con varias paradas

El móvil SHALL permitir armar un recorrido local de hasta cinco lugares publicados del catálogo, en el orden elegido, y calcular una ruta que pase por todos; la API SHALL aceptar hasta cuatro paradas intermedias válidas antes del destino.

#### Scenario: Agregar un lugar al recorrido

- **WHEN** la persona toca «Agregar al recorrido» en la ficha o la hoja de un centro o establecimiento con coordenadas
- **THEN** el lugar se agrega al final de «Mi recorrido» y el control indica que ya está incluido

#### Scenario: Recorrido lleno o lugar repetido

- **WHEN** el recorrido ya tiene cinco lugares o el lugar ya está en él
- **THEN** no se agrega de nuevo y, si está lleno, el control lo explica y queda deshabilitado

#### Scenario: Reordenar y quitar

- **WHEN** la persona sube, baja o quita una parada en «Mi recorrido»
- **THEN** el orden se actualiza y se conserva en el dispositivo

#### Scenario: Ruta en orden

- **WHEN** la persona toca «Cómo llegar en orden»
- **THEN** la ruta sale de su ubicación, pasa por las paradas en ese orden y termina en el último lugar, mostrando las paradas en el mapa y en el panel

#### Scenario: Paradas inválidas en el enlace

- **WHEN** el enlace de ruta trae una lista de paradas ilegible, con más de cuatro paradas o con una coordenada fuera de rango
- **THEN** se ignoran todas las paradas y la ruta va solo al destino

#### Scenario: Demasiadas paradas en la API

- **WHEN** una solicitud de ruta trae más de cuatro paradas intermedias o una coordenada inválida
- **THEN** la API responde 400 sin consultar al proveedor

### Requirement: Navegación entre paradas

El móvil SHALL avanzar de parada en parada durante la navegación y SHALL considerar la llegada al destino solo después de alcanzar todas las paradas intermedias.

#### Scenario: Llegar a una parada intermedia

- **WHEN** la posición queda a 35 m de la siguiente parada o la guía ya pasó su llegada
- **THEN** la voz anuncia la parada, la navegación continúa hacia la siguiente y el aviso muestra la próxima parada

#### Scenario: Recalcular a mitad del recorrido

- **WHEN** la persona se desvía y la ruta se recalcula
- **THEN** la nueva ruta sale de su posición y solo incluye las paradas pendientes

#### Scenario: Recorrido circular

- **WHEN** el destino final está junto al punto de partida y quedan paradas pendientes
- **THEN** la navegación no da por terminado el recorrido, ni en primer plano ni en la tarea de fondo

#### Scenario: Llegada final

- **WHEN** se alcanzaron todas las paradas y la posición llega al destino
- **THEN** se usa el flujo de llegada: mensaje, cuenta regresiva de 60 s y acciones del lugar
