# Plan: selección de marcadores superpuestos

## Objetivo

Permitir que la persona elija entre un centro turístico y uno o más establecimientos
cuando sus marcadores quedan superpuestos o demasiado cercanos para identificar cuál se
tocó.

## Alcance

- Consultar las capas renderizadas de centros y establecimientos en un área táctil pequeña.
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
2. Consultar features renderizadas en el área del toque y deduplicar capas repetidas.
3. Integrar la sheet controlada por estado y sus acciones de selección/cierre.
4. Verificar formato, typecheck, lint, pruebas y diff.

## Riesgos

- Un marcador cercano pero no superpuesto podría entrar en el área de selección; el radio se
  mantiene alineado con el hitbox táctil del mapa.
- Una capa de cluster debe seguir expandiéndose antes de ofrecer candidatos individuales.
- La consulta puede fallar mientras el estilo carga; en ese caso se conserva el feature del
  evento de la fuente como fallback.

## Migraciones

No aplica.

## Estado

- [ ] Implementar modelo y consulta de candidatos.
- [ ] Implementar bottom sheet de selección.
- [ ] Ejecutar verificaciones móviles.
