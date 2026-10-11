## ADDED Requirements

### Requirement: Apertura del catálogo sin ordenación redundante

El móvil SHALL ordenar las ciudades visibles con un comparador español reutilizable y recalcular sus grupos solo cuando cambian los datos del catálogo o sus descargas, manteniendo cierre del menú previo a navegación.

#### Scenario: Catálogo remoto con ciudades sin paquete

- **WHEN** se abre mapas sin conexión con ciudades remotas sin paquete descargable
- **THEN** esas ciudades no participan en la ordenación visual salvo que ya estén descargadas, y se conserva el estado vacío o de carga correspondiente

#### Scenario: Descarga ausente del catálogo remoto

- **WHEN** el catálogo remoto falla o deja de incluir una ciudad conservada
- **THEN** la ciudad descargada permanece visible y puede abrirse o eliminarse localmente

#### Scenario: Actualización del progreso de una descarga

- **WHEN** cambia el progreso sin cambiar los datos de ciudades ni los metadatos locales
- **THEN** no se vuelve a combinar, ordenar y separar todo el catálogo

### Requirement: Lecturas locales proporcionadas a la consulta

El móvil SHALL consultar metadatos de ciudades y fichas individuales sin hidratar rutas, estilos y lugares de todos los paquetes; el contenido completo solo se carga para la consulta que lo necesita, manteniendo compatibilidad con descargas existentes.

#### Scenario: Abrir catálogo o ficha local

- **WHEN** se listan ciudades descargadas o se solicita un centro individual
- **THEN** se reciben únicamente los metadatos o centros necesarios con validación

#### Scenario: Consulta espacial con límites antiguos ausentes

- **WHEN** una descarga anterior no tiene límites de cobertura completos
- **THEN** no se excluye silenciosamente de los candidatos locales

### Requirement: Búsqueda local con preparación reutilizable

El móvil SHALL reutilizar documentos normalizados y un índice local por paquete, conservar relevancia, sinónimos, coincidencias aproximadas, orden y cobertura, y liberar el índice cuando se libera su contenido.

#### Scenario: Varias consultas sobre una descarga

- **WHEN** se cambia el texto sin cambiar el paquete descargado
- **THEN** se reutiliza su preparación y se conservan las coincidencias admitidas

#### Scenario: Cambiar o borrar descarga

- **WHEN** se actualiza o elimina un paquete
- **THEN** se invalidan las lecturas locales sin seguir buscando en su índice anterior
