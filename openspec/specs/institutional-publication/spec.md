# institutional-publication Specification

## Purpose

Describir la captura y revisión institucional de centros en la API, preservando
la ficha pública durante la edición y separando publicación de activación.

## Requirements

### Requirement: Borrador separado de la ficha publicada

La API SHALL conservar las propuestas de edición separadas de la ficha pública y rechazar la edición incompatible con el estado de revisión.

#### Scenario: Cambios aún no aprobados

- **WHEN** una cuenta autorizada guarda una propuesta para un centro publicado
- **THEN** la propuesta queda pendiente del flujo de revisión y la ficha pública conserva la versión publicada

#### Scenario: Edición durante revisión

- **WHEN** se intenta guardar una ficha cuyo borrador está en revisión
- **THEN** la API comunica el conflicto de estado sin aplicar esa edición

### Requirement: Conflicto de versión suministrada

La API SHALL rechazar un guardado que aporte una versión de borrador distinta de la versión vigente, cuando ya existe un borrador.

#### Scenario: Edición concurrente

- **WHEN** otra edición ha avanzado el borrador y el consumidor envía la versión anterior
- **THEN** la API responde con conflicto y solicita recargar antes de guardar

### Requirement: Decisión de revisión del administrador

La API SHALL reservar la decisión a ADMINISTRADOR, exigir motivo al rechazar y publicar los datos aprobados con su multimedia pendiente y auditoría dentro de la transacción de revisión.

#### Scenario: Aprobación vigente

- **WHEN** el administrador aprueba una revisión vigente cuyos datos son válidos y completos
- **THEN** se publican sus datos, se actualiza el estado y se registra la decisión y publicación

#### Scenario: Rechazo sin motivo

- **WHEN** el administrador intenta rechazar sin motivo
- **THEN** la API rechaza la decisión sin cambiar la revisión

#### Scenario: Decisión repetida

- **WHEN** se intenta resolver una revisión que ya no está en revisión
- **THEN** la API informa conflicto sin aplicar una nueva decisión

### Requirement: Compatibilidad de publicación y activación

La API SHALL reconocer una publicación ya aprobada mediante el endpoint legado sin duplicar su auditoría y mantener la activación como decisión administrativa independiente.

#### Scenario: Repetición del endpoint legado

- **WHEN** se solicita publicar un centro cuya ficha y borrador ya están publicados
- **THEN** se confirma el resultado existente sin crear otra publicación

#### Scenario: Desactivación

- **WHEN** el administrador desactiva un centro publicado
- **THEN** deja de exponerse como centro público visible y conserva su estado de revisión

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

### Requirement: Conservación con estado sin confirmar

La API SHALL permitir publicar una ficha autorizada con estado de conservación
desconocido en un componente, conservarlo como NULL junto con sus factores y
observaciones, y leerlo sin inventar un estado ni perder datos. SHALL asignar
cero puntos al estado desconocido y conservar las validaciones de los factores.

#### Scenario: Entorno sin estado con factores

- **WHEN** se aprueba una ficha válida con atractivo Alterado, entorno nulo y factores catalogados en ambos componentes
- **THEN** la ausencia del estado del entorno no bloquea la aprobación
- **AND** ambos componentes conservan sus factores y observaciones al leer la publicación
- **AND** la conservación suma cinco puntos del atractivo y cero del entorno

#### Scenario: Factores sin evaluación previa en el contenido

- **WHEN** un componente válido tiene factores válidos y su estado no está informado
- **THEN** se conserva una evaluación del componente con estado NULL
- **AND** los factores no se omiten ni se asocian a otro componente

#### Scenario: Progreso con desconocido explícito

- **WHEN** ambos componentes registran un estado conocido o explícitamente nulo
- **THEN** el apartado puede mostrarse completo sin convertir el desconocido en un estado conocido

#### Scenario: Referencia inválida o cuenta sin acceso

- **WHEN** hay estados conocidos inactivos, factores inválidos, duplicados o una cuenta sin permiso para aprobar
- **THEN** se conserva el rechazo correspondiente sin publicar datos parciales
