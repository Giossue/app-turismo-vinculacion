# Proposal

## Why

El usuario solicita adaptar CognitiveStack dev e instalar OpenSpec completo en
ambos repositorios conservando sus stacks. El monorepo necesita fuentes coherentes
con la API y el móvil existentes para evitar implementar decisiones de una plantilla.

## What Changes

- Adaptar organización, briefs, criterios de UI, seguridad y skills al dominio turístico.
- Corregir referencias documentales superadas y conservar historia y parches nativos.
- Instalar OpenSpec 1.14.1 global y local, las integraciones de Codex y Claude con doce workflows.
- Registrar una base de comportamiento contrastada con código, sin cambiar runtime.

## Capabilities

### New Capabilities

Nuevas en el inventario documental; describen funcionalidad existente:

- `identity-and-record-access`: sesión, roles y alcance por registro.
- `public-tourism-discovery`: centros publicados, búsqueda y filtros públicos.
- `institutional-publication`: captura, revisión, publicación y concurrencia de centros.
- `tourism-agent`: chat estructurado autenticado, streaming y cancelación.
- `mobile-navigation-and-location`: navegación turística, sesión y ubicación contextual.
- `offline-city-content`: catálogo, manifiestos públicos y almacenamiento nativo.
- `multimedia-access`: validación de cargas y exposición pública de archivos publicados.
- `favorites-and-opinions`: favoritos propios y opiniones versionadas moderadas.

### Modified Capabilities

Ninguna; el inventario de specs estaba vacío.

## Impact

Entrypoints, docs, skills, configuración OpenSpec, scripts de tooling y lockfile
del monorepo. La coordinación con el panel MUI se documenta en ambos repositorios.
Se preservan API, contratos, pantallas, esquema SQL y tecnologías; tampoco se
modifican archivos ajenos en `docs/vinculacion/`.

No se ejecutan suites del producto, builds nativos, migraciones ni operaciones
de producción. Las comprobaciones de instalación no certifican despliegues.
