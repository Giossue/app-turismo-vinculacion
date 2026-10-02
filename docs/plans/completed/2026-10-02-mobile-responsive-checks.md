# Comprobación automatizada de responsividad móvil

## Objetivo

Disponer de una herramienta repetible que pruebe componentes nativos reales en
varios tamaños Android, orientación horizontal, texto ampliado y teclado; guardar
capturas y geometría para detectar controles fuera de pantalla o inaccesibles.

## Alcance

- Harness Expo separado de las rutas del producto, con datos ficticios en memoria.
- Emulador Android aislado; conservar el teléfono y Metro existentes del usuario.
- Python estándar y ADB, sin dependencias nuevas ni llamadas a la API.
- Casos de pestañas/barra inferior, chat, panel de ruta y formulario.
- Revisar las capturas además del árbol accesible: sus bounds no demuestran por sí
  solos que todo el texto está dibujado sin recortes.
- Corregir defectos observados y repetir los casos afectados.
- La matriz Android no certifica iOS ni todos los modelos físicos.

## Trabajo

- [x] Crear harness separado y runner con restauración de configuración Android.
- [x] Ejecutar matriz de tamaños, orientación, texto ampliado y teclado.
- [x] Revisar evidencia y corregir defectos reproducidos.
- [x] Documentar comandos, resultados y cobertura pendiente.
- [x] Detener exclusivamente los procesos de QA al terminar.

## Verificación

- 36 casos de cuatro escenarios en nueve perfiles Android aprobados después de
  repetir los casos afectados; 319 comprobaciones en el informe consolidado.
- Evidencia local: `/tmp/turismo-responsive-final/report.md`, con ejecución
  inicial, reintentos, capturas PNG, XML y dumps del teclado conservados.
- Correcciones: pestañas y barra inferior con texto ampliado, compositor y
  teclado horizontal del chat, scroll y acción principal del panel de ruta.
- TypeScript, lint, formato de los archivos añadidos y 255 pruebas del móvil
  (51 archivos) aprobados. Runner Python compila y `git diff --check` pasa.
- Configuración del emulador restaurada; Metro 8092 y emulador de QA cerrados.
  Se conserva el Metro original 8081 y el teléfono con sus ajustes originales.
  El APK ARM previo se restauró y el APK de QA se conserva en `/tmp`.
- Cobertura pendiente: resto de pantallas, iOS, modelos físicos, recortes de
  cámara, otros teclados, lectura auditiva y rotación con estado ya abierto.
  Los fixtures no verifican API, autenticación, GPS ni enrutamiento real.

## Fuentes

- [ADB](https://developer.android.com/tools/adb).
- [Emulador por CLI](https://developer.android.com/studio/run/emulator-commandline).
- [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/expo/).
- [Metro de Expo](https://docs.expo.dev/guides/customizing-metro/).
- [Dimensiones React Native 0.86](https://reactnative.dev/docs/0.86/usewindowdimensions).
- [Texto React Native 0.86](https://reactnative.dev/docs/0.86/text).
