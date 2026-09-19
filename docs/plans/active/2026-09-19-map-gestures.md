# Plan: gestos del mapa móvil

## Objetivo

Hacer más libre el giro del mapa y reservar la inclinación para un gesto vertical de tres
dedos, conservando el paneo con un dedo y el zoom/giro con dos dedos.

## Diseño

- Activar la prioridad nativa de rotación de MapLibre Android para que el giro no sea
  clasificado prematuramente como pinch-zoom.
- Adaptar el detector de inclinación nativo a tres dedos en Android e iOS.
- Mantener la configuración en un parche de pnpm de `@maplibre/maplibre-react-native`,
  sin editar `node_modules` como fuente de verdad.
- Reconstruir el binario porque el cambio modifica código nativo.

## Estado

- [x] Implementar el parche nativo de Android.
- [x] Implementar el detector de tres dedos en iOS.
- [x] Activar `touchPitch` en el mapa móvil.
- [ ] Generar y registrar el parche de pnpm.
- [ ] Ejecutar typecheck, lint y verificación Android proporcional.
