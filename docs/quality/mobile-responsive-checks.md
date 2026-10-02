# Pruebas de responsividad en Android

La herramienta combina un emulador Android, ADB y un runner Python sin dependencias
externas. Ejecuta componentes nativos del producto con fixtures, conserva capturas
y consulta sus controles en el árbol accesible de Android.

El harness vive en `apps/mobile/qa`: es una aplicación Expo de prueba separada de
las rutas del producto. No necesita cuentas, ubicación, mapas remotos ni API.
Su servidor Metro debe usar un puerto distinto del utilizado por la aplicación.

## Ejecución

Requiere Python 3, ADB, SDK Android y un AVD disponible. Usar un emulador aislado
con archivos de usuario propios. Por ejemplo, con el AVD local `Pixel_API34`:

```bash
mkdir -p /tmp/turismo-responsive-avd
emulator -avd Pixel_API34 -datadir /tmp/turismo-responsive-avd \
  -no-snapshot -no-window -no-audio -gpu swiftshader -port 5558
```

Desde `apps/mobile/android`, generar un APK compatible con ese emulador:

```bash
./gradlew :app:assembleDebug -PreactNativeArchitectures=x86_64 \
  -PreactNativeDevServerPort=8092 --max-workers=4
```

Desde la raíz del monorepo, instalar **en el serial del emulador** e iniciar Metro
del harness en una terminal separada:

```bash
adb -s emulator-5558 install -r apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
adb -s emulator-5558 reverse tcp:8092 tcp:8092
corepack pnpm --dir apps/mobile exec expo start qa --port 8092 --lan
python3 scripts/check-mobile-responsive.py --serial emulator-5558 \
  --output /tmp/turismo-responsive-report
```

La variante nativa de desarrollo instalada debe ser
`ec.edu.ueb.turismovinculacion.software.dev`, como la utilizada en este repositorio.
El runner rechaza teléfonos físicos y restaura tamaño, densidad, fuente y rotación
del emulador al finalizar, incluso ante errores. Verifica también el valor efectivo
de fuente y registra normalizaciones equivalentes de Android.

Usar `--quick` para tres perfiles, `--screens chat,route` para seleccionar casos o
`--matrix 320x568:1,640x360:2` para una matriz específica. Tamaños en dp y escala de
fuente después de los dos puntos. Cada ejecución genera `report.json`, `report.md`,
capturas PNG, XML y dumps del teclado. Detener el Metro dedicado y cerrar el
emulador de QA al terminar; el runner no instala ni cierra otros procesos.

El Metro de QA observa explícitamente `../src` y `../assets` para incorporar cambios
en los componentes del producto. Después de cambiar su configuración, reiniciarlo.

## Cobertura

- Pestañas de la ficha y barra de navegación inferior.
- Mensajes y tarjetas del agente, tiempos de llegada y compositor con teclado.
- Panel de ruta compacto y expandido con destino largo.
- Campos compartidos de formulario, scroll y acción final.
- Tamaños estrechos y amplios, horizontal y fuente ampliada.

La matriz predeterminada tiene nueve perfiles: 320×568, 360×640, 390×844 y 412×915
con fuente 1.0; 640×360 y 844×390 horizontales con fuente 1.0; 360×640 con fuente
1.5; 320×568 y 640×360 con fuente 2.0. Cada perfil reinicia las escenas; no prueba
la conservación del estado al girar una conversación o ruta ya abierta.

El informe registra dimensiones y `fontScale` reportados por React Native. Una
comprobación pasa cuando los controles esperados están presentes y se pueden
alcanzar; se guardan capturas para comprobar también los textos dibujados.
El botón de envío y los modos de ruta deben mostrar al menos 44 dp después del
scroll; una franja del control no cuenta como alcanzable. La confirmación del
formulario debe mostrar al menos una línea a la escala de fuente del perfil.
La comprobación de teclado exige que el IME no esté en modo de extracción a
pantalla completa: sus bounds pueden dejar accesible la app subyacente aunque
ese editor la tape visualmente.

## Resultado del 2 de octubre de 2026

Se ejecutaron cuatro escenarios en nueve configuraciones: 36 casos aprobados
después de repetir los casos afectados. El informe consolidado conserva la
ejecución inicial y sus reintentos en
`/tmp/turismo-responsive-final/report.md`, junto con JSON, XML y capturas.
Los archivos de `/tmp` son evidencia local temporal; conservarlos en el destino
de QA habitual si se necesitan después de limpiar esa carpeta.

Se corrigieron etiquetas de pestañas y barra inferior que se recortaban con
fuente ampliada, la altura del compositor y su visibilidad sobre el teclado en
horizontal, y el scroll del panel de ruta con destinos largos. La acción visible
de navegación usa una etiqueta breve al ampliar la fuente y conserva su nombre
accesible completo. Se revisaron también las capturas de los casos afectados.

Los reintentos resolvieron una ejecución del chat interrumpida al corregir el
estado inicial del teclado y actualizar la app mediante Fast Refresh, y un
criterio del runner que aceptaba un botón parcialmente visible.
La configuración del emulador se restauró correctamente. Pasaron TypeScript,
lint y las 255 pruebas existentes del paquete móvil (51 archivos).

Este resultado corresponde a los componentes y fixtures descritos arriba; no es
una aprobación de responsividad de todas las pantallas de la aplicación.

## Límites

El árbol accesible no detecta todos los recortes visuales. Revisar las capturas y
repetir los escenarios después de cambiar componentes compartidos. Este harness
verifica presentación con datos controlados: no verifica autenticación, API,
enrutamiento real, mapa, GPS, todo el historial de navegación ni lectura auditiva.

La matriz del emulador Android no sustituye la validación en iOS, dispositivos con
recortes de cámara, diferentes teclados ni una revisión de todas las pantallas.
Mantener pendientes esos puntos en `mobile-checklist.md` hasta verificarlos.
