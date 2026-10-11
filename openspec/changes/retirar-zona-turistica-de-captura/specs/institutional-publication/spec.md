## ADDED Requirements

### Requirement: Zona interna opcional y compatible

La API SHALL permitir crear y revisar una ficha sin zona turística y conservar
una referencia histórica de zona sin cambios aunque ya no esté activa, manteniendo
la validación de zonas activas para nuevas asignaciones de clientes anteriores.

#### Scenario: Centro sin zona

- **WHEN** una ficha completa y autorizada no aporta zona turística
- **THEN** esa ausencia no impide crearla, revisarla o publicarla

#### Scenario: Relación histórica sin cambios

- **WHEN** se guarda o revisa una ficha sin modificar su referencia existente de zona
- **THEN** la inactividad de esa zona no exige corregir un campo interno retirado de la captura

#### Scenario: Nueva asignación desde un cliente anterior

- **WHEN** un consumidor aporta una zona nueva o distinta de la referencia vigente
- **THEN** la API exige que exista y esté activa antes de admitirla
