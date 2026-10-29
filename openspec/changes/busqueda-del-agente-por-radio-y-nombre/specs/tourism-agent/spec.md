## ADDED Requirements

### Requirement: Búsqueda por nombre en centros y establecimientos

El agente SHALL buscar por texto en centros publicados y establecimientos publicados en una sola herramienta, sin filtrar por distancia, y SHALL devolver una pista de reintento cuando no haya coincidencias.

#### Scenario: Un negocio que no es un centro
- **WHEN** la persona pregunta por «La Tola», que solo existe como establecimiento
- **THEN** la búsqueda devuelve ese establecimiento con su referencia para mostrar su tarjeta

### Requirement: Cercanía limitada al radio

El agente SHALL presentar como cercano solo lo que esté dentro del radio pedido (5 km por defecto, máximo 25 km). Si no hay nada, SHALL indicar el lugar más cercano fuera del radio como lejano, con su distancia.

#### Scenario: Nada dentro del radio
- **WHEN** no hay lugares a menos de 5 km pero sí uno a 48 km
- **THEN** el resultado trae cero lugares cercanos y `outsideRadius` con ese lugar y 48 000 m de distancia
