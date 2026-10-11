# favorites-and-opinions Specification

## Purpose

Describir las colecciones personales y opiniones turísticas de la cuenta
autenticada, con separación entre propuestas, versiones públicas y moderación.

## Requirements

### Requirement: Favoritos propios autenticados

La API SHALL permitir a TURISTA y ADMINISTRADOR consultar y modificar sus propios favoritos de centros y establecimientos usando la identidad de la sesión.

#### Scenario: Colección personal

- **WHEN** una cuenta autorizada solicita sus favoritos
- **THEN** recibe su colección sin acceder a favoritos de otras cuentas

#### Scenario: Visitante sin sesión

- **WHEN** una solicitud de favoritos no tiene una sesión válida
- **THEN** la API responde como no autenticada

### Requirement: Repetición de guardado de favorito

La API SHALL mantener un solo favorito por cuenta y destino al repetir su guardado y limitar la eliminación a la relación de esa cuenta.

#### Scenario: Guardar otra vez

- **WHEN** la cuenta guarda nuevamente un destino ya favorito
- **THEN** no se crea una segunda relación de favorito para ese destino

### Requirement: Opinión propia versionada

La API SHALL asociar la creación, consulta privada y edición de una opinión a la cuenta autenticada y conservar las propuestas como versiones sujetas a moderación.

#### Scenario: Editar una opinión aprobada

- **WHEN** la cuenta presenta una edición válida de su opinión que admite nueva propuesta
- **THEN** se conserva la versión publicada y la nueva versión queda pendiente de moderación

#### Scenario: Consultar opinión propia

- **WHEN** una cuenta consulta su opinión de un centro
- **THEN** la API usa su identidad y no permite seleccionar la identidad de otra cuenta

### Requirement: Moderación y exposición pública de opiniones

La API SHALL reservar revisión, historial y eliminación institucional a ADMINISTRADOR y entregar públicamente las versiones publicadas admitidas por la visibilidad del centro.

#### Scenario: Propuesta pendiente

- **WHEN** un visitante consulta las opiniones públicas de un centro visible
- **THEN** la API no entrega como publicada una propuesta pendiente

#### Scenario: Moderador sin rol

- **WHEN** una cuenta sin rol ADMINISTRADOR intenta decidir la moderación
- **THEN** la API rechaza la operación por permisos insuficientes

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

### Requirement: Listas móviles con montaje acotado

El móvil SHALL virtualizar resultados, guardados y ciudades; las opiniones dentro de una ficha mostrarán como máximo veinte filas por página sin eliminar resultados, borradores ni acciones existentes.

#### Scenario: Lista extensa

- **WHEN** se abre una colección extensa y se desplaza
- **THEN** se monta una ventana de filas y todos los elementos siguen accesibles

#### Scenario: Avanzar opiniones

- **WHEN** se avanza a otra página o se vuelve a la anterior
- **THEN** se presentan sus opiniones sin montar simultáneamente todas las páginas ni borrar el borrador
