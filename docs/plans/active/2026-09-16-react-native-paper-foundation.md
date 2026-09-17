# Base de interfaz móvil con React Native Paper

## Objetivo

Adoptar React Native Paper estable como kit de componentes estándar en la aplicación
móvil, sin sustituir los componentes especializados de MapLibre.

## Alcance

- Añadir `react-native-paper` 5.15.3 (MIT) mediante pnpm/Corepack.
- Crear temas semánticos claro y oscuro y montar el proveedor en la raíz.
- Crear adaptadores reutilizables para acciones, iconos, campos y superficies en
  `src/core/ui`.
- Reemplazar los controles estándar de la pantalla de mapa por esos adaptadores,
  preservando la experiencia mapa-first.

## Fuera de alcance

- Migrar a Paper v6, que es pre-release.
- Cambiar MapLibre, rutas, ubicación, fichas de contenido o la web HeroUI.
- Añadir un bottom sheet externo: se evaluará junto con el módulo real de rutas.

## Dependencia

| Paquete | Propósito | Mantenimiento/licencia | Superficie de riesgo |
| --- | --- | --- | --- |
| `react-native-paper@5.15.3` | Controles React Native accesibles, tema Material 3 y portal | Callstack; versión estable reciente; MIT | Dependencia UI JavaScript y portal global. Se limita a adaptadores de `src/core/ui`, sin datos, red ni secretos. |
| `@expo/vector-icons@^15.1.1` | Fuente de iconos Material Community usada por Paper en Expo | Expo; versión compatible con SDK 57; MIT | Recursos de fuente incluidos en el cliente; sin red, datos ni permisos. |

## Riesgos

- Paper aplica Material Design por defecto; los adaptadores mantienen los tokens de
  Turismo Vinculación para no copiar la apariencia genérica de Material.
- El mapa y sus superposiciones tienen requisitos de rendimiento propios y no se
  reemplazan por componentes de Paper.

## Verificación

- Inspeccionar compatibilidad de peers y lockfile.
- Tipos, pruebas, lint, formato y Development Build Android.
- Mantener exploración sin GPS ni cambios a los permisos.

## Estado

En curso.
