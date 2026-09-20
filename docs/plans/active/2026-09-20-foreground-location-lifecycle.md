# Sesión global de ubicación en primer plano

## Objetivo

Hacer que el mapa mantenga una única sesión de ubicación entre pantallas, reanude el
seguimiento al volver al primer plano y diferencie permiso, proveedor/GPS, señal y
seguimiento activo.

## Alcance

- Compartir estado y coordenada de ubicación desde el layout raíz del móvil.
- Solicitar ubicación al abrir Explorar y usar `watchPositionAsync` mientras la aplicación
  está en primer plano.
- Revalidar permiso y servicios al regresar a la aplicación y recuperar la sesión cuando
  sea posible.
- Mantener el seguimiento en segundo plano de las funciones que ya lo requieren, sin
  activar una nueva función persistente desde este plan.
- Corregir el aviso del mapa para que `idle` no se interprete como GPS apagado y llevar
  el estado de disponibilidad al propio control.
- Ocultar el control cuando la cámara está centrada, mostrarlo al alejar la cámara y
  representar la falta de posición con una línea gris en el propio icono.
- Actualizar documentación y agregar pruebas del modelo de estados.

## Fuera de alcance

- Historial de coordenadas.
- Activar un nuevo modo de seguimiento en segundo plano desde Explorar; requiere un plan
  específico, consentimiento y revisión de permisos de plataforma.
- Cambios en API, base de datos, OSRM o configuración de Dokploy.
- Nuevas dependencias.

## Archivos previstos

- `apps/mobile/src/core/location/use-user-location.tsx`
- `apps/mobile/src/app/_layout.tsx`
- `apps/mobile/src/app/(tabs)/index.tsx`
- pruebas de ubicación del móvil
- `docs/architecture/maps-navigation.md`
- `docs/architecture/mobile.md`
- `docs/security/privacy-location.md`

## Pasos

1. Convertir la ubicación en una sesión compartida y controlada por ciclo de vida.
2. Mantener la posición puntual y un watcher foreground reanudable.
3. Ajustar la UI y las transiciones de estado.
4. Documentar el comportamiento y probar typecheck, lint dirigido y tests.

## Riesgos y mitigaciones

- Consumo de batería: precisión equilibrada, intervalo/distancia moderados y detener el
  watcher cuando la app no está activa; navegación conserva su servicio explícito.
- Duplicación de listeners: una sola suscripción global y limpieza idempotente.
- GPS activado sin señal: conservar el estado `requesting`/`error` y no mostrar un mensaje
  falso de GPS apagado.

## Estado

Implementado; pendiente de validación manual en el dispositivo Android conectado.
