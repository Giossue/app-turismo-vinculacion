# Navegación y adaptación móvil

Las pestañas reales son Explorar y Guardados; Menú abre una sheet. Perfil,
Configuración, ficha y ruta son pantallas secundarias. El stack representa
pantallas, sin snapshots de zoom, scroll, filtros o selección.

Usar `replace` para destinos de pestaña y `push` para pantallas secundarias.
Cerrar overlays antes de navegar. Atrás cierra primero el overlay de la pantalla
enfocada y, si no existe, retira una pantalla. Limpiar listeners y tareas al salir.

`TourismScreenFrame` centraliza safe area y ancho de pantallas secundarias;
Explorar y ruta mantienen mapa a pantalla completa. Usar dp, dimensiones del
viewport y `fontScale`, sin asumir una densidad o teclado ideales.

Si se añade un drawer modal, usar el progreso nativo compartido de
`ReanimatedDrawerLayout`; el menú actual conserva su sheet. No introducir un
`NavigationContainer` ni navegación paralela a Expo Router.

Probar accesibilidad y dispositivos cuando se solicite verificación, usando el
[procedimiento móvil](../quality/mobile-responsive-checks.md). Diseño:
[fundamentos](design-foundations.md); reglas: [AGENTS móvil](../../apps/mobile/AGENTS.md).
