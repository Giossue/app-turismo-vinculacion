---
name: implement-mobile-feature
description: Build React Native/Expo mobile features involving MapLibre, location, navigation, offline state, tourist UX, or guide field capture.
---

# Implement mobile feature

Read `docs/README.md` first to route the task, then read `docs/architecture/mobile.md`,
`maps-navigation.md`, `docs/security/privacy-location.md` and the feature specification.
Before using an Expo, React Native, MapLibre or Gesture Handler API, consult its official
versioned documentation. If a command, build, test or runtime integration fails, return to
the matching official API/troubleshooting section before changing the implementation.

Model denied permissions, GPS off, stale location, network loss and cancellation as
normal states. Keep browsing usable without location. Request background access only for
active navigation and release tracking/resources when it ends.

Use repositories behind TanStack Query, generated API models, local cache only for declared
cached or draft state, and Expo SecureStore only for minimal credentials. MapLibre requires
a Development Build, never Expo Go. Verify supported Android and iOS devices, deep links,
lifecycle restoration, accessibility and degraded networks.

## UI declarativa y navegación

Aplica el patrón state-driven UI / single source of truth de React: la vista debe derivarse
del estado y las acciones deben actualizarlo explícitamente. Los overlays transitorios
(bottom sheets, fichas y menús) se cierran o desmontan antes de navegar a otra pantalla;
no deben quedar montados debajo o encima de la ruta por depender solo del re-render o de la
transición del navegador.

Los drawers modales deben usar `ReanimatedDrawerLayout` de
`react-native-gesture-handler` dentro de un `GestureHandlerRootView`. Ese componente mantiene
panel, scrim y gesto en un único progreso nativo; no sustituirlo por un `Modal` con
animaciones independientes. Las acciones que navegan se ejecutan después de `onDrawerClose`.

## Historial de navegación

Separa navegación de estado efímero: zoom, paneo, scroll, filtros y selección local no
crean rutas ni snapshots en el stack. En Android registra el back handler por pantalla
enfocada para cerrar primero overlays y, si no hay uno, ejecutar exactamente un `router.back()`;
no conviertas cada cambio de UI en una entrada de historial. Para navegación tipo pestaña
usa `router.replace`; reserva `router.push` para pantallas secundarias que sí necesitan un
regreso explícito.

## Anotaciones MapLibre

Para puntos públicos estáticos usa `GeoJSONSource` con `Layer` de tipo `symbol` y clustering
nativo; evita un `Marker` o `ViewAnnotation` React por cada centro. Registra `Images` con
recursos locales para los iconos, activa `icon-allow-overlap` cuando la visibilidad del pin
sea prioritaria y deja el conteo de clusters en una capa separada. Así zoom y paneo se
resuelven en el render nativo sin recalcular ni desmontar vistas React en cada gesto.
