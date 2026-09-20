# Módulos funcionales

| Módulo | Funciones principales | Fase sugerida |
| --- | --- | --- |
| Identidad | registro, login, recuperación, perfil, roles y consentimientos | núcleo |
| Descubrimiento | destacados, categorías y recomendaciones editoriales | núcleo |
| Mapa | capas, marcadores, clustering, viewport y posición opcional | núcleo |
| Búsqueda | texto, territorio, clasificación, distancia, servicios y accesibilidad | núcleo |
| Centros | ficha pública simplificada y detalle técnico autorizado | núcleo |
| POI | consulta, cercanía, favoritos, opiniones y navegación | núcleo |
| Catastro | alojamiento, alimentación, agencias, CRUD administrativo por localidad, contacto y fallback territorial | núcleo |
| Rutas | origen manual/actual, cálculo, instrucciones y navegación | núcleo gradual |
| Transporte | cooperativas, recorridos, paradas, horarios y precios referenciales | núcleo gradual |
| Favoritos | centros/POI guardados y sincronización | núcleo |
| Opiniones | calificación, comentario, reporte y moderación | núcleo |
| Captura | borradores administrativos, ficha núcleo y envío | núcleo |
| Publicación | comparación, observación, aprobación, rechazo, publicación y auditoría por administrador | núcleo |
| Importaciones | Excel/CSV, validación, duplicados y reporte por fila | núcleo administrativo |
| IA | chat fundamentado, recomendaciones y fuentes | fase 2 |
| Itinerarios | jornadas, visitas, tiempos, rutas y replanificación | fase 2 |
| Multimedia | fotos, videos, audioguías, subtítulos y traducciones | fase 2 |
| Eventos/clima | agenda, pronóstico, alertas y cierres | fase 2 |
| Notificaciones | preferencias, push y entregas | fase 2 |
| Reportes | publicación, consultas, fichas, importaciones y operación | fase 2 |

## Regla de alcance

“Núcleo” no significa desarrollar todo simultáneamente. El primer corte vertical es:
centro publicado → API → búsqueda espacial → marcador → ficha pública → revisión web.
