# Evidencia de rendimiento móvil

Fecha: 2026-10-11. Implementación local; no acredita despliegue ni reinstalación.

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

No se añadieron ni ejecutaron suites de tests en esta solicitud. Tampoco se reinstaló,
se modificó producción ni se ejecutaron migraciones. Pendiente comprobación física de
scroll/teclado/fuente ampliada, primer arranque offline, cambio de paquete, respuestas
retardadas, opiniones con varias páginas, API con varios cientos de centros y consumo
real de memoria/fotogramas. La muestra pasiva de la APK anterior no valida esta versión.
