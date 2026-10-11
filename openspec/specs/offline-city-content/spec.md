# offline-city-content Specification

## Purpose

Describir el catálogo y los manifiestos de ciudad que permiten al consumidor
nativo conservar contenido turístico público para su consulta sin conexión.

## Requirements

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

### Requirement: Catálogo y manifiesto público de ciudad

La API SHALL exponer ciudades y disponibilidad de paquete y entregar manifiestos
con cobertura, versión y contenido turístico público; SHALL seleccionar los
atractivos por sus coordenadas dentro del área descargable sin exigir una zona
turística asignada en la captura institucional.

#### Scenario: Atractivo sin zona

- **WHEN** un atractivo activo y publicado tiene coordenadas dentro de la cobertura
- **THEN** aparece en el manifiesto aunque no tenga una zona turística asignada
- **AND** ese contenido permite ofrecer la ciudad como descargable

#### Scenario: Fuera de cobertura o no publicado

- **WHEN** un atractivo está fuera del área, inactivo o sin publicación aprobada
- **THEN** no se incluye aunque conserve una zona relacionada con esa ciudad

#### Scenario: Ruta de centros del área

- **WHEN** una ruta publicada se asocia a centros públicos de la cobertura
- **THEN** se incluye una sola versión publicada de esa ruta aunque los centros no tengan zona

#### Scenario: Actualización de ubicación o publicación

- **WHEN** cambia la ubicación de un centro o se retira su publicación
- **THEN** la versión anuncia contenido actualizado sin retroceder al desaparecer de la cobertura

#### Scenario: Descarga anterior

- **WHEN** existe una descarga anterior a la selección geográfica
- **THEN** sigue siendo legible y la API ofrece una versión superior para actualizarla

### Requirement: Disponibilidad explícita del paquete

La API SHALL distinguir una ciudad sin paquete publicado de un paquete cuya zona de descarga no está disponible.

#### Scenario: Paquete inexistente

- **WHEN** la ciudad solicitada no tiene un paquete publicado
- **THEN** la API responde como no encontrado

#### Scenario: Zona no definida

- **WHEN** el paquete carece de una zona de descarga disponible
- **THEN** la API responde con indisponibilidad y no fabrica una cobertura

### Requirement: Persistencia local versionada

El móvil nativo SHALL conservar manifiestos por ciudad con su versión y permitir consultarlos y eliminarlos localmente sin depender de una nueva respuesta de la API.

#### Scenario: Consultar contenido conservado

- **WHEN** existe un manifiesto válido almacenado para la ciudad y no hay conectividad
- **THEN** el móvil puede recuperar ese contenido local con su versión

#### Scenario: Eliminar manifiesto

- **WHEN** el usuario elimina el contenido local de la ciudad
- **THEN** su manifiesto deja de estar disponible como contenido conservado

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
