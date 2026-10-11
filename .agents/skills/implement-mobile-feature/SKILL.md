---
name: implement-mobile-feature
description: Implementa features móviles de Expo/React Native con MapLibre, navegación, ubicación, offline o datos turísticos; la captura institucional vive en el panel separado.
---

# Implementar una feature móvil

Leer [AGENTS móvil](../../../apps/mobile/AGENTS.md), [mobile](../../../docs/architecture/mobile.md),
[mapas/rutas](../../../docs/architecture/maps-navigation.md), privacidad y el cambio.
Consultar la documentación oficial versionada antes de APIs nativas y ante fallos.

Diseñar con el brief cognitivo y componentes Tourism/Paper existentes. La UI deriva
del estado; cerrar overlays antes de navegar. Las rutas representan pantallas,
sin snapshots de gestos o filtros. Mantener replace para pestañas y push para detalles.

Conservar alternativas para permisos denegados, GPS apagado, posición antigua,
red caída y cancelación. Background requiere función voluntaria y permiso;
cancelar no inicia navegación. Liberar listeners, tareas y recursos al terminar.

Reutilizar HTTP/query keys/geo/formato, parsers y almacenamiento declarado.
Refresh y perfil mínimo en SecureStore nativo; no persistir chat o ubicación histórica
por conveniencia. MapLibre requiere Development Build, no Expo Go.

Preservar clustering nativo, fuentes/capas estables y los parches de plataforma.
El diseño de nuevos drawers sigue las reglas móviles; el menú actual es una sheet.

Alinear contrato API y docs. Pruebas/dispositivos se ejecutan cuando se solicite;
registrar entorno y límites sin atribuir pruebas omitidas como correctas.
