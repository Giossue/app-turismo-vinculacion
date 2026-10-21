## ADDED Requirements

### Requirement: Lugares cercanos a un punto

La API SHALL entregar centros y establecimientos del catastro publicados, activos y no eliminados dentro de un radio acotado alrededor de un punto, ordenados de menor a mayor distancia en línea recta, con un filtro fijo y un límite de resultados; el móvil SHALL mostrarlos en «Cerca de mí» sin persistir la ubicación.

#### Scenario: Lista mezclada por distancia

- **WHEN** se consulta un punto válido sin filtro
- **THEN** la API devuelve centros y establecimientos publicados del radio, del más cercano al más lejano, sin superar el límite

#### Scenario: Filtro por tipo de lugar

- **WHEN** se elige «Atractivos», «Comida» u «Hospedaje»
- **THEN** la lista contiene solo centros, catastro de alimentos o catastro de alojamiento respectivamente

#### Scenario: Consulta no válida

- **WHEN** falta la ubicación, el radio supera 20 km, el límite supera 50 o el filtro no existe
- **THEN** la API rechaza la consulta como solicitud incorrecta

#### Scenario: Ubicación no disponible

- **WHEN** el permiso de ubicación se rechaza o el GPS está apagado
- **THEN** la pantalla explica que necesita la ubicación y ofrece volver a intentarlo sin consultar la API

#### Scenario: Privacidad de la ubicación

- **WHEN** el móvil consulta lugares cercanos
- **THEN** envía la coordenada redondeada a unos 100 m y el resultado queda solo en memoria, fuera de la caché persistida
