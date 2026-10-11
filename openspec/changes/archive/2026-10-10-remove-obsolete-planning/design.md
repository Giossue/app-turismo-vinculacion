# Design

## Context

Ver el motivo en [proposal.md](proposal.md). El `dev` remoto revisado sigue en
`0eaedfdca6feb08929711869982740e7b0de3fe1` y contiene `openspec/changes/` y
`openspec/specs/`, sin una carpeta `docs/plans/`. Los 94 documentos originales del
monorepo coinciden byte por byte con el commit local `91736d206fe194838f07fb72b45c95411f6e75d2`.

## Goals / Non-Goals

**Goals:** una sola estructura de planificación, referencias resolubles y recuperación
de antecedentes mediante Git, con hashes verificables.

**Non-Goals:** convertir pendientes históricos en trabajo completado, cambiar requisitos
del producto o introducir otra carpeta de planificación paralela.

## Decisions

1. **Retirar la carpeta física.** Se eliminan los archivos originales y los routers
   añadidos durante la primera adaptación. Conservarla con un nombre distinto
   mantendría la estructura que el usuario pidió reemplazar.
2. **Historia en Git.** `retired-documents.json` registra commit, rutas originales,
   SHA-256 y estados declarados. El contenido completo se recupera con `git show`;
   el inventario no constituye evidencia de ejecución ni de resolución de pendientes.
3. **Fuentes vigentes.** Los índices, skills y contexto del CLI remiten a OpenSpec.
   La deuda histórica se referencia por su commit; las feature docs siguen aportando
   contexto. Las comprobaciones iniciales enlazan esta corrección sin reescribir
   sus resultados como si la carpeta hubiera estado ausente desde el inicio.
4. **Cambio documental.** `skip_specs: true` evita inventar requisitos para una
   reorganización. Se conservan las specs, integraciones generadas, manifiestos,
   lockfiles y parches nativos de la instalación ya preparada.

## Risks / Trade-offs

- Consulta de antecedentes requiere Git → registrar el commit y cada ruta original
  en un inventario independiente de nombres o ramas móviles.
- Un estado antiguo puede estar desactualizado → mantenerlo como declaración histórica
  y reconciliarlo con código al proponer un nuevo cambio OpenSpec.
- Referencias antiguas pueden romperse → revisar enlaces locales y routing después
  de retirar la carpeta; excluir los archivos ajenos de `docs/vinculacion/`.

## Migration Plan

Verificar los documentos contra Git, escribir el inventario, corregir referencias y
retirar el árbol anterior. Comprobar formato, integridad y OpenSpec, y archivar este
cambio. La recuperación puntual usa `git show <commit>:<ruta-original>`.
