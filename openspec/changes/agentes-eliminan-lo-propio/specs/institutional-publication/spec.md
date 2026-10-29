## ADDED Requirements

### Requirement: El agente elimina sus propios centros y catastros

La API SHALL permitir a un `AGENTE_TURISTICO` eliminar solo los centros y catastros cuyo `responsable_usuario_id` sea el suyo, y SHALL rechazar con 409 la eliminación mientras el registro está en revisión. Un registro ajeno SHALL responder 404. El `ADMINISTRADOR` SHALL conservar la eliminación de cualquier registro.

#### Scenario: Agente elimina su borrador
- **WHEN** un agente elimina un centro o catastro que él creó y está en `BORRADOR`
- **THEN** el registro se elimina

#### Scenario: Registro ajeno
- **WHEN** un agente intenta eliminar un registro creado por otra persona
- **THEN** la API responde 404 y no elimina nada

#### Scenario: Registro en revisión
- **WHEN** un agente intenta eliminar su registro mientras está `EN_REVISION`
- **THEN** la API responde 409 y no elimina nada
