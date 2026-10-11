---
name: implement-operational-frontend
description: Diseña o adapta componentes y superficies móviles Tourism/Paper o el scaffold Next existente, siguiendo el brief cognitivo; el panel institucional se implementa en su repo.
---

# Adaptar una superficie

Leer [frontend](../../../docs/architecture/frontend.md),
[brief](../../../docs/architecture/cognitive-architecture.md) y patrón afectado.
Definir usuario, objetivo, decisión, datos mínimos y acción principal.

Priorizar P0/P1, revelar detalles y elegir componentes existentes. Conservar
tokens, estado, permisos contextuales, cancelación y accesibilidad. Una pantalla
móvil usa Paper/Tourism y sus reglas nativas; una del panel usa MUI en su repo.
No trasladar kits, gestores o snippets web a React Native.

Modelar carga/vacío/error/offline, recuperación y resultados tardíos. Mantener
historial de pantallas separado del estado efímero y cerrar overlays al navegar.
Coordinar API si cambia comportamiento; documentar el delta y la evidencia.

Pruebas visuales o de producto se ejecutan cuando se solicite. No rediseñar
superficies adyacentes ni activar módulos por una referencia de plantilla.
