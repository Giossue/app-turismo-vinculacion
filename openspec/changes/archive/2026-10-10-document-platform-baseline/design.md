# Design

## Context

La motivación y capacidades están en [propuesta](proposal.md). El monorepo ya
contiene API, móvil, SQL incremental y parches nativos, pero parte del knowledge
describe un bootstrap futuro o tecnologías ausentes. Los planes conservan estados
heterogéneos. El panel Next/MUI es un producto institucional en otro repositorio.

## Goals / Non-Goals

**Goals:** fuentes únicas, routing corto, criterios cognitivos propios de móvil/API,
workflows regenerables y escenarios base contrastados con código.

**Non-Goals:** refactorizar runtime, cambiar ORM/auth/UI, certificar planes pendientes,
incorporar tenants/colas, probar dispositivos o modificar datos remotos.

## Decisions

1. **Adaptación por área.** Producto conserva propósito y vocabulario; OpenSpec
   describe comportamiento; arquitectura, seguridad y calidad conservan sus
   responsabilidades. Se evita duplicar instrucciones completas en entrypoints.
   Copiar la plantilla entera introduciría Express/Prisma/Better Auth y criterios
   web incompatibles con React Native.
2. **Stack y contexto nativo.** Se conserva el ADR móvil, las restricciones de
   Expo/MapLibre/Paper y los parches. El brief P0-P3 se aplica a mapas, sheets,
   permisos y listas nativas; MUI se documenta en el panel. No se cambia un widget
   o la navegación por una referencia de CognitiveStack.
3. **Inventario base acotado.** Las ocho capacidades se contrastan con controllers,
   guards y servicios presentes. Los escenarios describen sus contratos y límites,
   no jobs, recuperación de contraseña o funcionalidades futuras de planes.
4. **Instalación reproducible.** OpenSpec 1.14.1 se fija global/local. El wrapper
   valida versión y usa perfil temporal con doce workflows y delivery both, sin
   modificar preferencias personales. Las integraciones de Codex y Claude se generan con el
   CLI en sus directorios de descubrimiento oficiales.
5. **Historia conservada.** No se mueven ni se marcan completos planes previos.
   Se modifican sus routers y las fuentes descriptivas afectadas, conservando ADRs
   y docs de parches, mapas y privacidad. Los archivos ajenos permanecen intactos.

## Risks / Trade-offs

- Referencias de plantilla asumidas como implementación → corregir contra
  manifiestos y código; distinguir criterios deseados de garantías actuales.
- Gran cantidad de generados → excluir de Docker y formato y comprobar que
  knowledge:update conserva exactamente su contenido.
- Base sintácticamente válida interpretada como certificación → evidencia separada
  y declaración explícita de suites, dispositivos y producción no comprobados.
- Versiones futuras de CLI o dev → actualizar pin, lockfile y fuente analizada
  juntos, revisar diferencias y regenerar con el perfil del proyecto.

## Migration Plan

Instalar tooling sin scripts de terceros, adaptar fuentes, registrar base y
validar instalación, enlaces y formato. Archivar los deltas completos para crear
las specs principales. No hay migración de datos. Una reversión de knowledge
debe conservar trabajo ajeno y no implica rollback de la aplicación.
