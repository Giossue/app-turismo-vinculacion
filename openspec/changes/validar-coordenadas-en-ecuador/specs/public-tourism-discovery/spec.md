## ADDED Requirements

### Requirement: Coordenadas dentro de Ecuador

La API SHALL rechazar al guardar un establecimiento o un centro unas coordenadas fuera de Ecuador (latitud entre -5,1 y 1,7; longitud entre -92,2 y -75,1) con un error de validación.

#### Scenario: Longitud en el océano
- **WHEN** un administrador guarda un establecimiento con longitud `-100,998689`
- **THEN** la API responde 400 con «Las coordenadas deben estar dentro de Ecuador…» y no guarda el cambio
