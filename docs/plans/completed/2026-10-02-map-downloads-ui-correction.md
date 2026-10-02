# Corregir descarga de mapas y composición del panel de ruta

## Objetivo

Retirar el guardado individual de rutas calculadas del producto. La descarga es del
mapa territorial con sus recorridos publicados incluidos. Simplificar el panel de
«Cómo llegar» retirando el título de modo repetido y la leyenda «Ruta más rápida».

## Alcance

- Retirar acción, descripción y estado de guardado del panel y la pantalla de ruta.
- Retirar el listado de rutas calculadas de «Mapas sin conexión».
- Conservar descarga, apertura, actualización y borrado de mapas por ciudad.
- Conservar datos locales antiguos y lectura por enlace sin nuevas escrituras.
- Sincronizar harness y documentación con el flujo corregido.
- Revisar la capacidad provincial sin anunciar cobertura que no existe. Actualmente
  requiere límites oficiales, publicación y contratos distintos de los de ciudad.
- Los recorridos publicados ya forman parte del paquete; calcular rutas nuevas sin
  conexión requiere otra capacidad. Se pidió aclaración al usuario sobre este punto.

## Trabajo

- [x] Retirar UI y escrituras de guardado individual de rutas.
- [x] Simplificar encabezado y métricas del panel.
- [x] Revisar los mapas existentes y documentar rutas incluidas y cobertura provincial.
- [x] Verificar tipos, diff y coherencia del flujo corregido.

## Resultado y verificación

- Retirados botón, descripción, hook de escritura y estados de guardado del flujo
  de «Cómo llegar»; retirado el listado separado de rutas de «Mapas sin conexión».
- Retirados título de modo y leyenda «Ruta más rápida»; se mantienen destino,
  pestañas, métricas, pasos, reintentos, loading verde y acción de navegación.
- El visor local explica que los recorridos publicados forman parte del mapa y
  deja de remitir a un listado de rutas guardadas inexistente.
- QA sincronizado; TypeScript y lint del móvil aprobados, formato de archivos
  modificados y `git diff --check` correctos. Revisión independiente del flujo.
- Sin nuevas dependencias ni cambios de API, permisos, base de datos o despliegue.
  No se borraron datos del dispositivo ni se manipularon procesos o teléfonos.
- Auditoría provincial: faltan límites oficiales, metadatos/publicación, API y
  contrato territorial para un paquete provincial real. Queda pendiente como
  capacidad distinta de esta corrección del flujo de descarga por ciudad.
- Los recorridos publicados son visualizables desde el paquete; el cálculo de
  nuevos trayectos continúa requiriendo internet. No se implementó un motor local.

## Fuentes

- `docs/product/features/offline-maps/`.
- `docs/architecture/mobile.md` y `maps-navigation.md`.
- [React Native 0.86](https://reactnative.dev/docs/0.86/view).
- [MapLibre OfflineManager](https://maplibre.org/maplibre-react-native/docs/modules/offline-manager/).
