## ADDED Requirements

### Requirement: Transporte móvil con espera acotada

El móvil SHALL acotar solicitudes JSON y su lectura por operación; vencer el plazo es un fallo de transporte, mientras cancelar conserva la cancelación y no activa un fallback que sustituya un destino retirado.

#### Scenario: API no responde

- **WHEN** una consulta pública supera su plazo sin completar la lectura
- **THEN** termina con un error de transporte y puede usar la copia local permitida

#### Scenario: Cancelación o publicación retirada

- **WHEN** se cancela la consulta o la API responde 404/403
- **THEN** se conserva esa causa y no se revive un destino con su copia offline

### Requirement: Descubrimiento progresivo y memoria transitoria

El móvil SHALL mostrar las páginas de atractivos del viewport al recibirlas, completar el área sin un recorte silencioso, cancelar al cambiar de consulta y retirar búsquedas inactivas de memoria tras cinco minutos.

#### Scenario: Área con varias páginas

- **WHEN** una caja contiene más de cien atractivos
- **THEN** la primera página se muestra antes de completar las restantes y todos los códigos válidos quedan disponibles

#### Scenario: Cambiar de caja

- **WHEN** se cambia la caja mientras se consulta otra
- **THEN** la respuesta anterior no se mezcla con las páginas nuevas ni persiste el viewport

#### Scenario: Búsquedas abandonadas

- **WHEN** una búsqueda deja de tener observadores durante cinco minutos
- **THEN** puede retirarse de memoria sin borrar favoritos o mapas descargados
