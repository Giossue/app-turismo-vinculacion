# Agente turístico con herramientas y chat estructurado

## Estado

Implementada la primera rebanada vertical para visitantes autenticados, incluyendo
propuestas no persistentes de recorrido con lugares publicados. La búsqueda cercana ahora
consulta centros, POI y establecimientos mediante PostGIS, y el agente dispone de tools de
transporte que degradan explícitamente cuando no hay registros operativos. La integración
queda lista para validarse con credenciales Anthropic y una prueba desde dispositivo real;
itinerarios persistentes, cálculo de rutas y voz quedan para unidades posteriores.

## Objetivo

Permitir que el agente consulte información turística publicada mediante herramientas
allowlisted y devuelva una respuesta JSON que la app móvil pueda renderizar como texto,
tarjetas de lugares y propuestas de acción.

## Alcance de esta unidad

- `searchPublishedCenters`: búsqueda textual de centros turísticos publicados.
- `getPublishedCenter`: ficha pública completa de un centro publicado.
- `searchNearbyEstablishments`: búsqueda de catastro público cercano por actividad/categoría,
  usando ubicación aproximada solo durante la solicitud.
- `searchNearbyPublishedPlaces`: búsqueda geoespacial combinada de centros publicados, POI
  activos y establecimientos activos; recibe radio, límite y categoría, no coordenadas.
- `getPublishedTransportForCenter` y `searchNearbyTransportStops`: consulta real de rutas,
  tipos, cooperativas, paradas y horarios; devuelven ausencia explícita si la BD está vacía.
- `findItineraryCandidates`: candidatos de 2 a 6 lugares publicados para una propuesta de
  recorrido; no calcula horarios, tiempos ni rutas.
- Tarjetas confiables de centros, POI y establecimientos; los POI usan referencias opacas por
  solicitud y no exponen el `id` interno.
- Tarjeta de itinerario con paradas ordenadas y apertura de cada ficha.
- Acciones propuestas `open_center` y `start_route`; iniciar navegación requiere confirmación
  explícita en el móvil y no se ejecuta desde el backend ni desde el modelo.
- Proveedor configurable por `AI_PROVIDER`, `AI_MODEL`, `OPENAI_API_KEY` y
  `ANTHROPIC_API_KEY`, con Anthropic soportado como opción operativa sin fijar en código un
  supuesto modelo “más reciente”.

## Actores y autorización

- Actor principal: turista autenticado (`TURISTA`).
- `ADMINISTRADOR` conserva acceso al endpoint por compatibilidad operativa, pero el agente solo
  puede leer datos públicos en esta unidad.
- La autenticación y los roles se validan con `AuthGuard`/`RolesGuard`; el agente no recibe
  tokens, correo, fecha de nacimiento ni datos de sesión.
- Centros, POI, establecimientos y transporte se consultan únicamente por repositorios/servicios
  públicos. No se exponen RUC, número de registro, IDs internos, SQL ni datos no publicados.

## Ubicación y privacidad

- La solicitud puede incluir una posición puntual y exactitud opcional.
- El servidor redondea la posición a aproximadamente tres decimales antes de consultar el
  catastro y no la persiste ni la registra.
- Si la ubicación no está disponible, la herramienta de cercanía devuelve un resultado seguro
  para que el agente lo comunique y pida activar ubicación o indique una localidad.
- No se envía historial de posiciones ni se inicia seguimiento en segundo plano por el chat.

## Contrato y transporte

`POST /api/v1/ai/chat` deja de ser texto en streaming y devuelve JSON:

```text
{
  text,
  cards,
  itinerary?,
  actions,
  sources
}
```

El modelo solo selecciona referencias opacas devueltas por las herramientas. El servidor
rehidrata tarjetas, destinos, coordenadas y fuentes desde resultados confiables y descarta
referencias inexistentes.

## Límites y degradación

- Entradas de chat, historial, ubicación y herramientas tienen límites estrictos.
- La generación usa un máximo pequeño de pasos y tokens y no dispone de ejecución genérica,
  SQL, escritura de datos, persistencia de itinerarios ni cálculo de rutas/horarios.
- Una clave de proveedor ausente falla cerrado con error de servicio sin filtrar configuración.
- Si una consulta pública falla, el agente comunica que no pudo verificarla; no se rellenan
  datos con conocimiento no fundamentado.
- La rate limit global existente de la API continúa aplicando; una cuota/coste específica de
  IA se evaluará antes de habilitar itinerarios persistentes o uso anónimo.

## Criterios de aceptación

- El backend valida el nuevo contrato y rechaza ubicación inválida, exceso de historial y
  propiedades desconocidas.
- El agente puede consultar centros publicados, POI activos y catastro cercano con ubicación
  aproximada; la frase “cerca de mí” fuerza la tool geográfica en el primer paso.
- El agente puede consultar transporte registrado y comunicar que no hay rutas/paradas/horarios
  publicados sin inventarlos.
- El agente puede proponer de 2 a 6 lugares publicados en un orden explícito, sin presentarlo
  como horario o ruta calculada.
- El backend solo devuelve tarjetas/itinerarios/acciones que correspondan a resultados de
  herramientas.
- Coordenadas y detalles de acciones no provienen de texto generado por el modelo.
- La app móvil valida el JSON, muestra tarjetas y fuentes, y maneja respuesta inválida/error.
- `start_route` muestra confirmación explícita y solo después navega a `/route`.
- No se alteran los cambios existentes de navegación por voz, cámara o seguimiento.

## Verificación

- [x] Pruebas unitarias de esquemas, adaptación de herramientas y sanitización.
- [x] Pruebas del controlador para respuesta JSON y entrada inválida.
- [x] Pruebas del parser móvil y de la solicitud de ubicación aproximada.
- [x] Typecheck, lint, Prettier y `git diff --check` en API; 24 suites y 121 tests pasan.
- [x] Tests, typecheck y Prettier del móvil; 12 suites y 40 tests pasan.
- [x] Lint móvil sin errores; permanece un warning previo sobre la dependencia de
  `visibleCenters` en un `useMemo` del shell del mapa.
- [x] Smoke SQL contra PostgreSQL: 1 centro publicado, 2 POI, 51 establecimientos y 0 rutas,
  paradas, asociaciones u horarios operativos; `EXPLAIN` mostró los índices GIST de POI y
  establecimientos para las consultas de radio.

## Siguiente unidad

Integrar cálculo de rutas vial con el proveedor existente y validación de duración/distancia;
después añadir persistencia explícita de itinerarios con confirmación por etapa. No permitir
que el modelo inicie navegación ni modifique centros/publicaciones.
