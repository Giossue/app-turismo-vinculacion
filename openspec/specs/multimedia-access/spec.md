# multimedia-access Specification

## Purpose

Describir las fronteras de carga institucional y entrega pública de multimedia
asociada a centros y establecimientos turísticos.

## Requirements

### Requirement: Carga y eliminación institucional autorizadas

La API SHALL exigir sesión, rol institucional y acceso al registro y estado correspondiente para listar, cargar o eliminar su multimedia.

#### Scenario: Centro fuera del alcance

- **WHEN** un agente intenta modificar multimedia de un centro fuera de su responsabilidad
- **THEN** la API rechaza el acceso sin modificar sus archivos

#### Scenario: Cuenta turística

- **WHEN** una cuenta TURISTA intenta una carga institucional
- **THEN** la API rechaza la operación por permisos insuficientes

### Requirement: Validación de la carga

La API SHALL rechazar archivos vacíos, truncados, superiores al límite configurado o incompatibles con los tipos y firmas admitidos antes de registrarlos como multimedia válida.

#### Scenario: Archivo superior al límite

- **WHEN** el multipart o el contenido supera el límite de carga
- **THEN** la API responde con un error de validación y no registra el archivo

#### Scenario: Firma incompatible

- **WHEN** el contenido no corresponde al tipo multimedia permitido declarado
- **THEN** la API rechaza el archivo

### Requirement: Entrega pública condicionada a publicación

La API SHALL entregar solo multimedia publicada de registros activos, publicados y no eliminados; los documentos internos de centros no se exponen por el recurso público de fotos, video y audio.

#### Scenario: Archivo público visible

- **WHEN** se solicita un archivo publicado de un registro públicamente visible y de un tipo admitido en esa ruta
- **THEN** la API entrega su contenido y tipo multimedia

#### Scenario: Archivo pendiente o registro oculto

- **WHEN** el archivo está pendiente, su registro está desactivado o no cumple la publicación requerida
- **THEN** la ruta pública responde como no encontrada sin entregar el contenido

### Requirement: Variantes públicas de fotografías con recursos acotados

La API SHALL aceptar tamaños públicos thumbnail y preview de 640/1280 píxeles de ancho, sin ampliar imágenes ni admitir dimensiones arbitrarias, comprobar publicación antes de usar variantes y acotar memoria y concurrencia de transformación.

#### Scenario: Fotografía publicada con tamaño admitido

- **WHEN** se solicita una variante de una fotografía pública visible
- **THEN** se entrega una WebP reducida o el original permitido si la transformación no está disponible

#### Scenario: Registro oculto o tamaño inválido

- **WHEN** el registro no está publicado o el tamaño no está admitido
- **THEN** se rechaza la solicitud correspondiente sin entregar una variante almacenada en memoria

### Requirement: Galería móvil paginada y compatible

El móvil SHALL mostrar hasta ocho fotos por página y solicitar variantes solo de multimedia propia; todas las fotos y descripciones permanecen accesibles y una API anterior conserva la entrega del archivo original.

#### Scenario: Galería extensa

- **WHEN** se avanza o retrocede entre páginas de fotos
- **THEN** se montan como máximo ocho imágenes y se conserva el acceso a todas las fotografías

#### Scenario: URL externa o API anterior

- **WHEN** la foto procede de otra URL o el servidor aún no admite variantes
- **THEN** no se altera la URL externa ni se rompe la visualización de la foto original
