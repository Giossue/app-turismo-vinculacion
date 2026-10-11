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
