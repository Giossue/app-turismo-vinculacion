# Design

## Context

El análisis y baseline están en proposal.md. Se conserva el cambio corregir-cache-movil y sus protecciones de generación, propietario y persistencia. React Compiler ya está habilitado; no se añade memo indiscriminadamente ni otra librería visual.

## Goals / Non-Goals

**Goals:** reducir trabajo repetido, elementos montados, memoria transitoria y esperas; conservar acceso a todos los resultados y a las descargas existentes.

**Non-Goals:** alterar GPS, sesión, proveedores, permisos, publicación, mapa base, stack o infraestructura; desplegar o reinstalar sin solicitud.

## Decisions

### Índice y lectura local

Preparar por manifiesto un índice de palabras y documentos normalizados con WeakMap, que no conserve paquetes por sí mismo. Preparar la primera lectura en bloques de 250 lugares que ceden el hilo; publicar el paquete
solo tras esa preparación. Compilar la consulta una vez; seleccionar candidatos conservadoramente y aplicar la fórmula vigente de relevancia, sinónimos y distancia. No eliminar coincidencias aproximadas ni acortar silenciosamente los resultados.

SQLite entrega proyecciones JSON pequeñas de metadatos y centros mediante JSON1, con validación. No necesita migración ni cambia el JSON almacenado. La variante web conserva su almacenamiento. Los manifiestos completos se consultan por ciudad bajo demanda y con retención breve, sin duplicarlos por viewport, filtrando por cobertura cuando existe una caja conocida. La invalidez o falta de límites conserva el paquete como candidato para evitar perder cobertura. Descargar/borrar invalida el prefijo local.

### Superficies

Brief: turista; objetivo encontrar y abrir lugares/descargas; decisión seleccionar un resultado o avanzar una página; información mínima nombre, tipo, localidad y disponibilidad; acción principal abrir. P0: destinos, estado de carga/error, acciones; P1: paginación y filtros; P2: detalles existentes; P3: sin información técnica en UI.

FlatList/SectionList mantienen claves, encabezados, texto escalable y estados. Fotos y opiniones viven dentro de scrolls de fichas: se paginan con tamaño fijo y botones Tourism para evitar una lista virtualizada anidada sin altura. Borradores y selección de pestañas no se desmontan por optimizar. No hay alturas de fila fijas que rompan accesibilidad.

### Transporte y memoria

Deadline JSON de 12 s incluyendo cuerpo; rutas 30 s, conexión SSE 30 s y manifiestos de descarga/transcripción 60 s. La cancelación voluntaria se conserva como AbortError; vencer el plazo es ApiError de transporte y puede activar el fallback autorizado. No se reintentan automáticamente escrituras ni se altera la generación de sesión. Estilos de mapa también tienen deadline.

Búsqueda pública inactiva: gcTime de cinco minutos; datos persistidos conservan su política. Opiniones muestran veinte filas por página y no se confunde recorte visual con eliminación de datos.

### Mapa progresivo

La consulta de viewport usa páginas infinitas con clave versionada y muestra la primera al recibirla. La siguiente se carga solo tras terminar la anterior; cambiar de caja cancela el transporte. Deduplicación y validación impiden bucles o páginas incoherentes. No se limita el catálogo ni se convierten pines en vistas React.

### Fotografías

La API admite size=thumbnail|preview para recursos públicos existentes, con anchos 640/1280 y sin ampliar imágenes. La autorización/publicación se comprueba antes de consultar la caché derivada. Sharp ya está instalado. La caché de variantes tiene límite de bytes, entradas, duración y trabajos concurrentes; saturación/fallo devuelve el archivo admitido original. Sin variantes nuevas en almacenamiento ni esquema.

El móvil añade el parámetro solo a las rutas multimedia propias, conserva URLs externas y solicita thumbnail en galería/preview en portada. Servidores anteriores ignoran el parámetro opcional y entregan la foto existente.

Frontera: actor público; activo fotografía ya publicada; validación estricta del tamaño; concurrencia acotada y deduplicada; sin nuevas escrituras, logs privados ni ampliación de acceso.

Fuentes: [Expo SQLite SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/), [Expo Image SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/image/), [FlatList RN 0.86](https://reactnative.dev/docs/0.86/flatlist), [TanStack Query v5](https://tanstack.com/query/v5/docs/react/guides/infinite-queries), [Sharp resize](https://sharp.pixelplumbing.com/api-resize/).

## Entrega Android solicitada posteriormente

La actualización conserva el paquete y la firma instalados y utiliza `adb install -r`,
sin desinstalar ni borrar datos. La APK incluye el bundle Hermes y no requiere Metro.
Durante el primer arranque de la build optimizada, Expo registró que no podía crear
`RNHeadlessAppLoader`; `usage.txt` de R8 confirmó su eliminación. El SDK obtiene esa
clase por nombre desde el manifiesto y llama su constructor por reflexión.

Se añade una regla exacta mediante `expo-build-properties.android.extraProguardRules`
en `app.json`, manteniendo la optimización del resto de clases. Prebuild regenera la
regla local; no se versiona el directorio Android ni se desactiva R8.

Escenarios de aceptación: una release conserva el nombre y constructor del cargador;
un arranque frío mantiene la app activa y deja de registrar el fallo; la actualización
conserva firma, identificador y fecha original de instalación. La navegación real en
segundo plano continúa pendiente y no se inicia seguimiento para comprobar el arranque.

Fuentes: [BuildProperties SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/build-properties/)
y [reglas de conservación de R8](https://developer.android.com/topic/performance/app-optimization/keep-rules-overview).

## Risks / Trade-offs

- La preparación inicial del índice cuesta trabajo y memoria; se mide separada de consultas calientes y se libera con el manifiesto.
- El deadline es una política ajustable; SSE no recibe el mismo límite total que una lectura JSON.
- Las miniaturas necesitan API nueva para ahorrar transferencia; móvil antiguo y servidor antiguo conservan compatibilidad.
- SQL JSON1 requiere comprobar proyecciones con JSON corrupto, límites ausentes y centros individuales.
- No se solicitan tests en esta tarea: se verifican tipos, lint, formato, builds y benchmarks; escenarios físicos completos siguen pendientes.
