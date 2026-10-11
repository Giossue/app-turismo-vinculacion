# Evidencia de rendimiento móvil

Fecha: 2026-10-11. Las medidas de implementación son locales; la actualización
Android solicitada posteriormente se documenta al final. No acredita despliegue de la API.

## Comparación de búsqueda

Node v24.16.0, Linux/x64 en ordenador. Se cargaron por separado las funciones TypeScript
anteriores de HEAD y las actuales, con el mismo manifiesto sintético de centros, cinco
iteraciones de calentamiento y treinta muestras por consulta. Cada centro tiene nombre
«Café del parque <n>», categoría turística, descripción y coordenadas de Guaranda. Se midió
`getOfflineSearchSuggestions`, sin SQL, red, ordenación final ni render React Native.
Las cifras de la revisión previa usaban otro fixture; esta tabla compara antes/después
dentro de la misma ejecución y no mezcla ambas muestras.

| Lugares | Consulta | Mediana anterior ms | Mediana actual ms | p95 anterior ms | p95 actual ms |
| ------- | -------- | ------------------- | ----------------- | --------------- | ------------- |
| 500     | `cafe`   | 1.17                | 0.10              | 2.14            | 0.13          |
| 500     | `museo`  | 1.93                | 0.03              | 2.45            | 0.08          |
| 5,000   | `cafe`   | 11.80               | 1.30              | 17.69           | 3.70          |
| 5,000   | `museo`  | 19.37               | 0.25              | 21.99           | 0.35          |
| 20,000  | `cafe`   | 48.92               | 4.28              | 54.23           | 7.27          |
| 20,000  | `museo`  | 75.21               | 1.03              | 78.32           | 1.43          |

Coincidieron los resultados completos en los seis pares. Otra muestra con 120 centros y
nombres variados comparó catorce consultas: tildes, sinónimos, varias palabras, aproximaciones,
sin resultados y cercanía; coincidió también la salida ordenada. Esto no acredita cobertura
exhaustiva de rutas, establecimiento, límites espaciales o todos los errores tipográficos.

La primera preparación síncrona de 20.000 lugares costó 111,95 ms. La lectura móvil usa
preparación cooperativa: en la muestra costó 195,49 ms totales, con 80 turnos del temporizador
y un intervalo máximo observado de 8,55 ms. Esa preparación reduce la ocupación continua
del hilo a cambio de mayor tiempo total; no elimina la primera lectura ni la validación
JSON. Las búsquedas calientes reutilizan el índice. Se desactiva el compartir recursivo del
JSON de contenido para conservar la identidad preparada tras actualizar un paquete.

## Proyección local y fotografías

Se ejecutaron las sentencias JSON1 extraídas del código con Python/SQLite 3.53.4, en memoria:
un JSON sintético de 6.619.498 bytes y 20.000 centros produjo un resumen de 436 bytes
(sin estilos) en 9,22 ms; un código concreto devolvió una fila de 331 bytes. Un JSON roto
se omitió y los metadatos de descarga ausentes o de tipo incorrecto no rompieron la
proyección. Son cantidades transferidas a JS; SQLite sigue leyendo el JSON en el motor.
Esto no valida todavía el puente Expo SQLite del teléfono.

La API compilada procesó una WebP sintética de ruido, 1600×1200 y 1.316.396 bytes:
thumbnail 640×480, 107.546 bytes; preview 1280×960, 647.068 bytes. La primera transformación
costó 141,71/289,74 ms y reutilizar la variante 0,74/0,72 ms. La compresión depende de la foto;
no se extrapolan esos tamaños a contenido real ni a peticiones completas con SQL/MinIO.
La revisión del flujo confirma que los servicios comprueban publicación antes de llamar
al caché de variantes; no se probó esa frontera contra un despliegue real.

## Calidad y límites

Tipos y lint de móvil/API correctos; formato de ambos paquetes correcto. El formato global
API detectó una condición anterior sin formatear en ai-agent.service.ts y se normalizó,
sin cambiar lógica. OpenSpec estricto: diez elementos válidos. Build de API y exportaciones finales web/Android correctos (salida 0).
La exportación web completó sus trece rutas y notificó cierre forzado de la CLI después
de exportar; Android produjo el bundle Hermes. No son una instalación ni una prueba física.

Se revisó el flujo de cancelación: las señales de consulta y de plazo se conservan sin
sobrescribirse; el plazo incluye cabeceras/cuerpo JSON y se retiran listeners/temporizadores.
Las mutaciones no reciben reintentos nuevos. 403/404 siguen excluyendo fallback de fichas.
La conectividad conocida activa la lectura local aunque todavía no exista un viewport.
Descargar/borrar invalida el prefijo de metadatos y contenido por ciudad.

Durante la implementación inicial no se añadieron ni ejecutaron suites de tests ni
se reinstaló, modificó producción o ejecutaron migraciones. Pendiente comprobación física de
scroll/teclado/fuente ampliada, primer arranque offline, cambio de paquete, respuestas
retardadas, opiniones con varias páginas, API con varios cientos de centros y consumo
real de memoria/fotogramas. La muestra pasiva de la APK anterior no valida esta versión.

## Actualización física de Android solicitada posteriormente

Se construyó el código de `2c98e93` para el Motorola Edge 50 Fusion conectado por ADB,
Android 14 y ABI `arm64-v8a`. La primera build terminó correctamente en 40 s y se
actualizó con `adb install -r`; el arranque frío mostró el mapa. Su registro Expo
contenía tres errores de inicialización de `RNHeadlessAppLoader`. R8 lo incluía en
`usage.txt`; tanto la APK previa como esta primera APK carecían del descriptor exacto
del cargador que Expo localiza por reflexión.

Se añadió la regla exacta en `app.json` y se regeneró Android con
`APP_VARIANT=production NODE_ENV=production corepack pnpm expo prebuild --platform android --no-install`.
La build final usó Java 17 y
`APP_VARIANT=production ./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a --max-workers=4 --console=plain`:
`BUILD SUCCESSFUL` en 3 min 5 s. El reporte de R8 conserva el nombre del cargador y
su constructor sin argumentos, y el descriptor está en el DEX de la APK final.
Minificación y reducción de recursos continúan habilitadas.

La APK final contiene el bundle Hermes de 5.370.080 bytes y mide 53.624.355 bytes.
Su SHA-256 es `789c9ebc2541f7ddaa36b05a19c2e0119e625de2609b0851b2b8d130a65dcd19`.
Se verificaron firma e identificador antes de instalarla; ambos coinciden con la app
anterior. `adb install -r` devolvió `Success`, sin desinstalar ni borrar datos. Android
conservó `firstInstallTime=2026-10-03 16:19:18` y actualizó `lastUpdateTime` a
`2026-10-11 01:50:29`. La APK recuperada del dispositivo tiene el mismo SHA-256.

`am start -W` respondió `Status: ok`, `LaunchState: COLD` y `TotalTime: 1426` ms.
Se comprobaron proceso activo, actividad en primer plano y captura local de la app.
El registro del nuevo proceso no contiene errores de ReactNativeJS, AndroidRuntime,
Expo ni fallos nativos de libc en la ventana observada. Esto comprueba el arranque,
sin acreditar navegación real en segundo plano, continuidad individual de cada
favorito/descarga o los demás escenarios de rendimiento pendientes. No se activó
seguimiento de ubicación ni se ejecutaron suites de tests; la API no se desplegó.

Prebuild, formato de los archivos afectados y validación estricta del cambio correctos.
Capturas, registros y APK de comprobación permanecen fuera del repositorio.

## Demora al abrir mapas sin conexión

El usuario notificó la pausa después de la actualización. Se reprodujo en el mismo
Motorola Edge 50 Fusion, Android 14, release Hermes, con sesión restaurada, 222
ciudades remotas precargadas y ninguna descarga local. Una grabación por ADB mostró
1,17 s sin fotogramas nuevos entre el cierre del menú y el comienzo de la transición.
La pantalla finalmente mostró el estado vacío: el catálogo observado no tenía
paquetes publicados. No se alteró publicación ni contenido de la API.

Para aislar la causa se construyeron dos APK temporales con marcas `performance.now()`
en el toque, final del cierre, render de destino y cálculo de grupos; sin datos
personales en las marcas. Se instaló cada una con `adb install -r` y se abrió la
misma opción desde Explorar. Una muestra por build:

| Medida en el hilo JS                           |       Antes |   Después |
| ---------------------------------------------- | ----------: | --------: |
| Cierre de la hoja desde el toque               |   265,81 ms | 256,07 ms |
| Inicio del destino tras terminar el cierre     |    10,79 ms |  19,16 ms |
| Hooks previos a los grupos                     |     3,98 ms |   0,35 ms |
| Combinación, ordenación y separación de grupos | 1.862,35 ms |  0,064 ms |
| Toque hasta cálculo de lista terminado         | 2.144,67 ms | 277,34 ms |

El cambio reutiliza el comparador de español, descarta de la ordenación las ciudades
que no pueden aparecer y memoiza los grupos. Con estos datos, el conjunto visible
está vacío; no se afirma que ordenar 222 filas visibles cueste 0,064 ms. Las marcas
de render JS tampoco miden el final de la transición nativa ni constituyen p95 o
una mejora porcentual general de la app. La grabación y las marcas son muestras
distintas; sus duraciones pueden variar con la carga del dispositivo.

Se revisó que las ciudades conservadas permanezcan candidatas aunque la API ya no
las publique, que falle el catálogo o que no haya conexión. Las dependencias de la
memoización son los datos remotos y los metadatos locales; cambiar progreso no
vuelve a ordenar y guardar/eliminar invalida los metadatos existentes.
No se crearon descargas ficticias ni se borraron datos del teléfono. Los escenarios
con paquetes descargados y con muchas filas publicadas no se ejecutaron físicamente.

Las marcas se retiraron del código y del bundle Hermes definitivo. Typecheck móvil,
ESLint de los dos archivos modificados, formato, `git diff --check` y validación
estricta del cambio OpenSpec correctos. No se ejecutaron suites de tests.
La build final Android terminó en 35 s; mantiene R8, la regla del cargador Expo,
el paquete y la misma firma. APK de 53.624.951 bytes, bundle de 5.370.676 bytes,
SHA-256 `ea26d4ed1f3ac16f09c47d1c638cc7e2df500e02e822d912a394e2edd7dd02d6`.

`adb install -r` respondió `Success`, conservó la fecha original de instalación y
registró la actualización el `2026-10-11 02:06:13`. La APK recuperada del dispositivo
coincide por SHA-256. Arranque frío `Status: ok`, `TotalTime: 1265` ms, proceso
activo y ningún error Expo, ReactNativeJS, AndroidRuntime o libc en la ventana observada.
La captura final confirmó el catálogo vacío; en la grabación definitiva ya está
completamente visible en el fotograma con PTS 1,01 s, sin la pausa intermedia de
1,17 s de la grabación anterior. El tiempo PTS no equivale a tiempo desde el toque.
Los registros de fotogramas del intervalo observaron 6/53 lentos antes y 2/78 después;
son muestras de esa apertura, no del rendimiento completo del mapa.
Capturas, diagnósticos y APK permanecen fuera del repositorio. La API no se desplegó.
