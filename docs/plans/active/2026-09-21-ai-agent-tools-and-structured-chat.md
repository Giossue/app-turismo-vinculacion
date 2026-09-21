# Agente turístico con herramientas y chat estructurado

## Estado

Implementada la primera rebanada vertical para visitantes autenticados, incluyendo
propuestas no persistentes de recorrido con lugares publicados. La búsqueda cercana ahora
consulta centros, POI y establecimientos mediante PostGIS, el agente dispone de tools de
transporte que degradan explícitamente cuando no hay registros operativos y puede delegar el
cálculo vial en el proveedor OSRM existente usando referencias confiables y métricas
verificables. El chat móvil también cuenta con streaming SSE de texto parcial y conserva la
respuesta estructurada final. La integración queda lista para validarse con credenciales
Anthropic y datos publicados reales; itinerarios persistentes y voz quedan para unidades
posteriores.

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
- `calculateRoadRoute`: cálculo vial entre referencias confiables, desde la ubicación aproximada
  o entre dos lugares publicados; no recibe coordenadas del modelo y no inicia navegación.
- `findItineraryCandidates`: candidatos de 2 a 6 lugares publicados para una propuesta de
  recorrido; puede combinarse con `calculateRoadRoute` para validar tramos.
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

`POST /api/v1/ai/chat` devuelve JSON estructurado para clientes compatibles:

```text
{
  text,
  cards,
  itinerary?,
  actions,
  sources
}
```

`POST /api/v1/ai/chat/stream` devuelve Server-Sent Events. Los eventos de texto contienen
el valor acumulado de `text` mientras AI SDK puede reconstruir parcialmente el objeto; el
evento `complete` contiene el mismo `AgentResponse` final sanitizado y `[DONE]` cierra el
flujo:

```text
data: {"type":"text-delta","text":"..."}

data: {"type":"complete","response":{...}}

data: [DONE]
```

Si falla el proveedor o el catálogo después de enviar cabeceras, el servidor emite un evento
`error` genérico sin detalles internos. El modelo solo selecciona referencias opacas devueltas
por las herramientas. El servidor rehidrata tarjetas, destinos, coordenadas y fuentes desde
resultados confiables y descarta referencias inexistentes.
El endpoint de streaming nunca emite tarjetas, acciones ni coordenadas parciales.

## Límites y degradación

- Entradas de chat, historial, ubicación y herramientas tienen límites estrictos.
- La generación usa un máximo pequeño de pasos y tokens y no dispone de ejecución genérica,
  SQL, escritura de datos ni persistencia de itinerarios. El cálculo vial depende del proveedor
  configurado y, si no responde o no encuentra ruta, se comunica la ausencia sin estimarla.
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
- El agente puede calcular rutas viales entre referencias verificadas y comunicar distancia y
  duración provenientes del proveedor; desde ubicación se marca como aproximado.
- El agente puede proponer de 2 a 6 lugares publicados en un orden explícito, y solo presentar
  tiempos/distancias cuando `calculateRoadRoute` los haya verificado.
- El backend solo devuelve tarjetas/itinerarios/acciones que correspondan a resultados de
  herramientas.
- Coordenadas y detalles de acciones no provienen de texto generado por el modelo.
- La app móvil consume texto parcial del SSE, valida la respuesta final, muestra tarjetas y
  fuentes, y maneja respuesta inválida/error.
- `start_route` muestra confirmación explícita y solo después navega a `/route`.
- No se alteran los cambios existentes de navegación por voz, cámara o seguimiento.

## Verificación

- [x] Pruebas unitarias de esquemas, adaptación de herramientas y sanitización.
- [x] Pruebas del controlador para respuesta JSON y entrada inválida.
- [x] Pruebas del parser móvil, del stream SSE y de la solicitud de ubicación aproximada.
- [x] Pruebas del controlador para respuesta JSON y eventos SSE.
- [x] Typecheck, lint, Prettier y `git diff --check` en API y móvil.
- [x] Tests de API completos: 25 suites y 123 tests pasan.
- [x] Tests móviles completos: 12 suites y 42 tests pasan.
- [x] Lint móvil sin errores; permanece un warning previo sobre la dependencia de
      `visibleCenters` en un `useMemo` del shell del mapa.
- [x] Smoke SQL contra PostgreSQL: 1 centro publicado, 2 POI, 51 establecimientos y 0 rutas,
      paradas, asociaciones u horarios operativos; `EXPLAIN` mostró los índices GIST de POI y
      establecimientos para las consultas de radio.
- [x] Tool de cálculo vial sobre el puerto OSRM existente: referencias confiables, origen
      aproximado redondeado, degradación de proveedor/no-route y confirmación móvil intacta.

## Siguiente unidad

Añadir persistencia explícita de itinerarios con confirmación por etapa y, después, voz. No
permitir que el modelo inicie navegación ni modifique centros/publicaciones.
