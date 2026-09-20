# Arquitectura web futura

La web no forma parte del cliente móvil en este monorepo. La vista pública y el panel
operativo viven en el repositorio independiente `web-turismo-admin`; la aplicación móvil
es el único cliente para turistas. Ambos clientes consumen la misma API NestJS y ningún
cliente abre conexiones directas a PostgreSQL.

## Áreas

- Pública: mapa básico, búsqueda, fichas, catastro y enlaces compartibles.
- Cuenta turística: favoritos e itinerarios con funciones limitadas.
- Operativa: captura, revisión, catálogos, transporte, moderación y auditoría.

## Stack

Next.js App Router, TypeScript estricto y MUI para el repositorio administrativo. Server
Components para landing y contenido público/SEO; Client Components solo cuando existe
interacción real. El panel usa superficies planas sin sombras, con bordes sutiles y radios
contenidos, además de componentes reutilizables con tokens centralizados.

## Estado

- URL: filtros, búsqueda, página, orden y zona del mapa cuando sea compartible.
- TanStack Query: datos del servidor e invalidación.
- React Hook Form: estado de formularios.
- Estado local: diálogos, menús y selecciones temporales.

## Interfaz operativa

- Navegación visible de máximo dos niveles.
- Formularios breves en diálogo; ficha de 14 secciones en páginas con progreso y guardado.
- Tablas con filtros consistentes, paginación y acciones por permisos/estado.
- Comparación clara entre publicado y propuesto durante revisión.
- Toda mutación comunica pendiente, éxito y error.
- El panel usa refresh token HttpOnly y access token solo en memoria; nunca localStorage.
- Desactivar es reversible y no requiere fricción destructiva excesiva.
- No mostrar nombres de tablas, IDs, JSON, rutas de objeto o proveedor salvo herramienta técnica autorizada.

La primera superficie operativa implementada en `web-turismo-admin` incluye Resumen,
Revisión, inventario, captura del núcleo de fichas, Catastro por localidad y Configuración. El editor consulta
catálogos activos, presenta las 14 secciones de la ficha con progreso calculado por la API
y captura adicional por sección (respuesta, observaciones y filas repetibles), además de
actividades, accesibilidad y facilidades normalizadas. El código institucional se muestra
por componentes y la jerarquía se mantiene de solo lectura; la sección de accesibilidad
selecciona la localidad cercana desde el catálogo y conserva su distancia aproximada. El
panel captura también vías terrestres, accesos acuáticos/aéreos, operadores de transporte,
criterios detallados de accesibilidad y señalización de aproximación antes de guardar el
snapshot. Los catálogos de conectividad se entregan por la API y admiten texto manual cuando
el despliegue aún no tiene una opción sembrada.
La sección de planta conserva también los ámbitos del atractivo/poblado, cantidades de planta,
facilidades con ubicación y responsables, y servicios complementarios en el mismo snapshot;
ninguna de esas relaciones crea un centro turístico nuevo.
La sección de características publica sus rangos de clima en la relación normalizada existente
y puede retirar el registro cuando se marca como no aplicable.
La sección de visitantes publica registros, temporadas, procedencias, informantes y afluencia
con sus meses normalizados, sin convertir un estado desconocido en una respuesta negativa.
Las políticas se publican contra preguntas activas del catálogo y se leen de vuelta para la
comparación; mientras falten esas preguntas, el borrador no puede publicarse.
El plan de promoción se normaliza de forma independiente; los medios sin tipo catalogado se
conservan en el borrador y detienen la publicación.
Las facilidades seleccionadas conservan cantidad y observación por opción. El panel consulta
`/admin/summary`, `/admin/centers`, `/admin/catalogs`,
`/admin/centers/:code/valuation` y `/admin/centers/:code`; las
mutaciones de borrador, revisión, aprobación, publicación, desactivación y reactivación
se realizan exclusivamente mediante la API. Los borradores se mantienen aislados de la
versión pública hasta publicar y cada mutación genera auditoría. Catastro consulta el
catálogo activo de localidades y mantiene sus establecimientos separados de las fichas de
centros. La consulta pública de catastro aplica fallback por actividad a la localidad activa
más cercana que tenga resultados y lo marca explícitamente. Las importaciones y auditoría
específica de catastro se incorporarán en fases posteriores.
La sección Catálogos permite administrar las opciones técnicas mediante la API y muestra
estados activos/inactivos sin conexión directa a PostgreSQL.
El editor también carga fotografías como multipart hacia `/admin/centers/:code/media`; la
API guarda el binario en el proveedor configurado, registra metadatos en PostgreSQL y solo
expone una imagen cuando la ficha se publica.

## Web móvil

La web pública debe funcionar en teléfono. El panel administrativo es responsive, pero
la captura de campo con GPS/cámara se optimiza en React Native.
