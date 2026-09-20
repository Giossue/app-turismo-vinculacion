# Auditoría profunda del build móvil

## Objetivo

Analizar el cliente Expo/React Native Android desde un árbol nativo generado de
nuevo, resolver advertencias atribuibles al proyecto y documentar las que
pertenecen a Expo, React Native o sus dependencias nativas.

## Alcance

- Instalación reproducible con `pnpm install --frozen-lockfile`.
- Formato, lint, TypeScript, pruebas y `expo-doctor`.
- `expo prebuild` Android limpio.
- Gradle clean, APK debug, lint, APK release y AAB release.
- Revisión de permisos, manifest, recursos, namespaces y deprecaciones.

## Decisiones

- Las modificaciones nativas se expresan mediante config plugins y parches de
  pnpm; `apps/mobile/android` es generado y no se edita como fuente.
- Android Lint usa temporalmente `android.lint.useK2Uast=false` porque el
  analizador K2 falla dentro de `react-native-worklets`/`react-native-reanimated`
  con `Cannot find a KaModule for the VirtualFile`. Debe revisarse al actualizar
  la matriz Expo/React Native/AGP.
- Se eliminan permisos de almacenamiento heredados que la app no necesita, se
  anotan APIs Android 33, se corrige el namespace de MapLibre y se limpian
  recursos generados que Lint identifica como no usados.
- Las deprecaciones de Gradle/Kotlin/C++ originadas dentro de dependencias se
  registran como upstream; no se editan dentro de `node_modules`.

## Verificación

Los logs completos quedan en `temp/mobile-build-logs/`. El script reproducible
principal es `temp/mobile-build-android.sh`; el chequeo de JavaScript/Expo es
`temp/mobile-build-audit.sh`.

## Resultado del ciclo 2026-09-20

- `pnpm install --frozen-lockfile`: correcto.
- Formato, ESLint, TypeScript y pruebas móviles: correctos; 7 archivos y 21
  pruebas pasaron.
- `expo-doctor`: 21/21 comprobaciones correctas.
- `expo export --platform web` y `expo export --platform android`: correctos.
- Android regenerado desde cero: `clean`, APK debug, Lint, APK release y AAB
  release correctos.
- Reporte Android Lint: `No issues found.`
- Artefactos verificados: `app-debug.apk`, `app-release.apk` y
  `app-release.aab`.
- El clasificador del log final encontró 137 avisos externos y 0 patrones de
  fallo.

Los logs finales del Android profundo están en
`temp/mobile-build-logs/android-20260920-091716/` y los de la auditoría Expo en
`temp/mobile-build-logs/20260920-090933/`.

El resumen final no detectó fallos. Los avisos restantes pertenecen a los
módulos externos y al toolchain: APIs Kotlin/Java/C++ obsoletas de Expo,
React Native, Reanimated, Screens, Gesture Handler, Safe Area y MapLibre, más
la sintaxis Gradle heredada de plugins/dependencias. No se parchean en
`node_modules` porque se perderían al instalar y podrían divergir del soporte
oficial; quedan registrados para revisarlos al actualizar la matriz Expo/RN.

La exportación web termina con código 0 y genera todos los archivos, pero Expo
puede mostrar `Something prevented Expo from exiting, forcefully exiting now`.
Es un problema conocido del ciclo de salida de `expo export`, no un fallo del
bundle ni de la aplicación.
