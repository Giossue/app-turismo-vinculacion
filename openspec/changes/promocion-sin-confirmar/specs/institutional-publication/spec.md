## ADDED Requirements

### Requirement: Promoción con respuestas sin confirmar

La API SHALL permitir publicar una ficha autorizada con respuestas
SIN_INFORMACION en las preguntas de plan, inclusión y paquete de Promoción,
conservar su desconocimiento al guardarlas y leerlas, y asignar cero puntos a
las respuestas no afirmativas sin convertirlas en No.

#### Scenario: Paquete desconocido

- **WHEN** se aprueba una ficha válida cuyo paquete turístico está sin confirmar
- **THEN** esa ausencia no impide publicar
- **AND** al leer la versión publicada el paquete sigue sin confirmar
- **AND** esa pregunta aporta cero puntos

#### Scenario: Plan desconocido y compatibilidad

- **WHEN** plan o inclusión están sin confirmar, o un cliente anterior envía inclusión nula
- **THEN** la proyección publicada conserva un estado desconocido
- **AND** la lectura no lo transforma en una respuesta negativa

#### Scenario: Respuestas conocidas y contradictorias

- **WHEN** se aprueba una ficha con plan No e inclusión Sí
- **THEN** se conservan ambas respuestas originales
- **AND** el cálculo aplica los pesos de las respuestas afirmativas sin inventar una corrección

#### Scenario: Medio inválido o actor sin acceso

- **WHEN** una ficha contiene un medio afirmativo sin referencia válida, o la cuenta no puede publicar el registro
- **THEN** la API conserva el rechazo correspondiente
- **AND** admitir decisiones desconocidas no omite catálogos, permisos, revisión ni auditoría
