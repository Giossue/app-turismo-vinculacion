# Spec Delta

## ADDED Requirements

### Requirement: Caché móvil privada por sesión

El móvil SHALL aislar favoritos y opinión propia por cuenta y vigencia de sesión, cancelar sus consultas al cerrar sesión y descartar callbacks y escrituras persistidas anteriores. Los favoritos sin conexión solo se muestran para la cuenta restaurada; un invitado no recibe datos privados.

#### Scenario: Favoritos de la misma cuenta sin conexión

- **WHEN** la sesión restaura su perfil local sin conexión y existe una colección persistida vigente de esa cuenta
- **THEN** Guardados muestra esa colección sin utilizar colecciones de otras cuentas

#### Scenario: Error tardío al guardar

- **WHEN** falla un guardado optimista iniciado antes de cerrar sesión o cambiar de cuenta
- **THEN** su reversión no recrea la colección anterior ni modifica la colección de la nueva sesión

#### Scenario: Opinión enviada antes de cambiar de cuenta

- **WHEN** la API confirma una opinión después de sustituir su sesión de origen
- **THEN** el móvil no escribe ese resultado en la opinión propia de la sesión actual

#### Scenario: Escritura privada pendiente al salir

- **WHEN** se solicita el cierre local con una escritura de favoritos pendiente o en curso
- **THEN** al completar la limpieza local no queda una copia privada que esa escritura pueda restaurar
- **AND** los datos públicos y las ciudades descargadas siguen disponibles según su vigencia

#### Scenario: Visitante sin cuenta

- **WHEN** un invitado abre Guardados o intenta guardar un destino o enviar una opinión
- **THEN** no se leen colecciones privadas ni se aplica una mutación privada

### Requirement: Persistencia de favoritos confirmados

El móvil SHALL conservar en disco la última colección confirmada mientras muestra cambios optimistas, con su fecha de actualización original. Si todavía no existe esa copia, no persiste una colección tentativa. Un fallo concurrente mantiene esa protección hasta revalidar la colección. Los guardados y opiniones fallidos sin conexión no quedan en una cola que se envíe al recuperar red.

#### Scenario: Reinicio durante un guardado pendiente

- **WHEN** se guarda un destino y la aplicación se cierra antes de confirmar la operación
- **THEN** al restaurar la caché se conserva la colección confirmada previa, sin inventar que el destino se guardó

#### Scenario: Fallo concurrente sin revalidación disponible

- **WHEN** falla uno de varios guardados y todavía no se puede revalidar la colección completa
- **THEN** la persistencia conserva la última copia confirmada, sin guardar el resultado tentativo de esas operaciones

#### Scenario: Copia confirmada vencida

- **WHEN** se muestra un cambio optimista sobre una colección confirmada hace más de 24 horas
- **THEN** ese cambio no renueva la fecha de la copia persistible

#### Scenario: Escritura sin conexión

- **WHEN** falla el transporte al guardar un destino o enviar una opinión sin red
- **THEN** el móvil informa el error y no deja el envío esperando la reconexión
