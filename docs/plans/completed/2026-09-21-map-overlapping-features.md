# Plan: selección de marcadores superpuestos

## Objetivo

Permitir que la persona elija entre un centro turístico y uno o más establecimientos
cuando sus marcadores quedan superpuestos o demasiado cercanos para identificar cuál se
tocó.

## Alcance

- Usar el marcador tocado como ancla y buscar centros y establecimientos dentro de un
  radio geográfico de 50 metros.
- Mantener el flujo actual cuando solo exista un candidato.
- Presentar una bottom sheet accesible con los candidatos cuando existan varios.
- Abrir la ficha correspondiente después de elegir un candidato.
- Mantener la selección como estado efímero del mapa, sin crear entradas de navegación.

## Fuera de alcance

- Cambiar la agrupación nativa de centros o la geometría almacenada.
- Crear relaciones nuevas en la API o en la base de datos.
- Resolver colisiones de etiquetas del mapa base.

## Archivos previstos

- `apps/mobile/src/features/map/domain/map-feature-selection.ts`
- `apps/mobile/src/features/map/presentation/center-map.native.tsx`
- `apps/mobile/src/features/map/presentation/center-map.web.tsx`
- `apps/mobile/src/features/map/presentation/map-feature-selection-sheet.tsx`
- `apps/mobile/src/app/(tabs)/index.tsx`

## Pasos

1. Modelar la selección común de centros y establecimientos.
2. Resolver el pin ancla, calcular candidatos por distancia geográfica y enfocar la cámara.
3. Integrar la sheet controlada por estado y sus acciones de selección/cierre.
4. Verificar formato, typecheck, lint, pruebas y diff.

## Riesgos

- El radio debe representar lugares caminables realmente cercanos sin depender del zoom ni
  del tamaño del marcador.
- Una capa de cluster debe seguir expandiéndose antes de ofrecer candidatos individuales.
- La consulta puede fallar mientras el estilo carga; en ese caso se conserva el feature del
  evento de la fuente como fallback.

## Migraciones

No aplica.

## Estado

- [x] Implementar modelo y consulta de candidatos.
- [x] Implementar bottom sheet de selección.
- [x] Ejecutar verificaciones móviles.

Resultado: la sheet abre en modo parcial con el controlador nativo visible; la persona puede
arrastrarla hasta la vista completa cuando la lista de candidatos lo necesita. La selección
múltiple usa un radio geográfico fijo de 50 metros alrededor del pin tocado. La cámara hace
zoom primero y, al terminar, abre la ficha si solo existe un candidato o la sheet con todos
los lugares cercanos cuando existen varios.
