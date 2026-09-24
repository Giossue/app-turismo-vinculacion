# Arquitectura de inteligencia artificial

## Objetivo

Chat turístico, recomendaciones, itinerarios y apoyo de redacción/validación para guías.
La IA explica información oficial; no se convierte en fuente de verdad.

## Flujo fundamentado

```text
pregunta -> policy/rate limit -> herramientas del backend
         -> SQL/PostGIS sobre contenido publicado
         -> contexto mínimo + IDs/versiones de fuente
         -> modelo -> respuesta estructurada
         -> verificación y citas -> usuario
```

La integración expone `POST /api/v1/ai/chat` como JSON estructurado y
`POST /api/v1/ai/chat/stream` como SSE para el chat móvil. El backend usa AI SDK Core
(`streamText` + `Output.object`) y selecciona OpenAI o Anthropic con `AI_PROVIDER` y
`AI_MODEL`; las claves `OPENAI_API_KEY` y `ANTHROPIC_API_KEY` nunca llegan a la aplicación
móvil. La respuesta final contiene `text`, `cards`, `itinerary` opcional, `actions` y
`sources`.

Las herramientas allowlisted de esta unidad son `listPublishedCenters`,
`searchPublishedEstablishments`, `searchPublishedCenters`,
`findItineraryCandidates`, `getPublishedCenter`, `searchNearbyEstablishments`,
`searchNearbyPublishedPlaces`, `getPublishedTransportForCenter`,
`searchNearbyTransportStops` y `calculateRoadRoute`. Las consultas de cercanía usan PostGIS sobre centros publicados,
POI activos y establecimientos activos; `searchNearbyPublishedPlaces` recibe únicamente radio,
límite y categoría opcional, mientras que las coordenadas se toman del contexto aproximado del
request. La intención cercana detectada en español obliga a ejecutar esa herramienta en el
primer paso para evitar convertir “cerca de mí” en una búsqueda textual. Las primeras tools
delegan en repositorios públicos y el modelo solo recibe referencias opacas de resultados; el
backend rehidrata/sanitiza tarjetas, itinerarios, fuentes y destinos y no acepta coordenadas ni
detalles escritos por el modelo. `calculateRoadRoute` solo recibe referencias emitidas por otras
tools y delega el cálculo al proveedor vial existente; devuelve distancia, duración e
instrucciones acotadas, sin exponer geometría al modelo. Desde la ubicación del visitante marca
el origen como aproximado y la app recalcula antes de navegar.

Descubrir centros, restaurantes o alojamiento en general no requiere GPS.
`listPublishedCenters` enumera centros publicados sin coordenadas del visitante;
`searchPublishedEstablishments` consulta el catastro activo/publicado por tipo y,
si la persona lo indicó, localidad. La primera tool se fuerza ante preguntas generales
de atractivos; la segunda ante preguntas generales de comida o hospedaje. Si el modelo
omite tarjetas, pide ubicación para una consulta general o falla después de consultar
el catálogo, la API construye una respuesta acotada con los resultados verificados.
Esas consultas esperan la validación final antes de enviar texto parcial para evitar
mostrar una solicitud de GPS contradictoria. Las fuentes de las tarjetas de estas
búsquedas identifican el registro público concreto.

Los POI no tienen código público en el esquema actual: se representan internamente con una
referencia opaca por solicitud y la respuesta solo contiene nombre, descripción, localidad y
coordenadas públicas. Las acciones `start_route` pueden apuntar a un POI, establecimiento o
centro, pero la navegación continúa requiriendo confirmación móvil.

Las herramientas de transporte consultan rutas, cooperativas, tipos, paradas, horarios y
asociaciones reales. Si las tablas operativas no tienen registros, devuelven una ausencia
explícita (“no hay rutas/paradas/horarios publicados”) y nunca inventan frecuencia, precio ni
duración.

El endpoint SSE solo transmite el campo de texto parcial acumulado (`text-delta`) y, al final,
la respuesta completa ya sanitizada (`complete`); nunca transmite tarjetas, coordenadas o
acciones parciales del modelo.
Si el cliente cierra la conexión SSE, el servidor aborta la generación del proveedor y no
emite más eventos. Detener una respuesta desde el móvil conserva la pregunta para un
reintento sin incluir la respuesta parcial en el historial enviado al modelo.
Las acciones son intenciones: `start_route` siempre exige confirmación explícita en el
móvil y no ejecuta navegación desde la API.

## Herramientas permitidas

- Buscar centros/POI/establecimientos publicados.
- Consultar ficha pública.
- Buscar por radio y filtros.
- Consultar rutas, paradas y horarios publicados, sin rellenar ausencias.
- Calcular rutas viales verificadas entre lugares registrados y validar distancia/duración.
- Proponer itinerarios con paradas publicadas y señalar las partes sin verificación
  de horario o tiempo de traslado.
- Recuperar fuentes de una recomendación.

El modelo no recibe acceso SQL, credenciales ni una herramienta genérica para ejecutar
código. Las herramientas validan entradas y aplican permisos.

## Recuperación

Priorizar SQL/PostGIS para hechos estructurados. Usar búsqueda textual y pgvector para
descripciones largas cuando se mida una mejora. Los embeddings se regeneran solo desde
versiones publicadas y conservan referencia a entidad/versión.

## Fuentes

Cada afirmación factual debe vincularse a centro, POI, establecimiento, ruta o documento
publicado. La respuesta distingue dato oficial, inferencia y ausencia de información.

## Privacidad

- Enviar solo ubicación aproximada necesaria para la consulta.
- No enviar email, fecha de nacimiento, tokens o historial completo.
- Preferencias e historial requieren consentimiento y controles de borrado.
- Claves del modelo exclusivamente en backend.

## Administradores

La IA puede redactar, traducir o detectar faltantes, pero nunca aprueba ni publica. El
usuario revisa el texto generado y queda autor/a de la decisión final.

## Planes e historial

`/ai/itineraries` guarda hasta siete jornadas con una a seis paradas cada una, siempre
referidas a centros publicados y autorizadas por titular. La propuesta inicial del
modelo se marca como no verificada en cuanto a horarios y tiempos de traslado.
`/ai/history` guarda turnos textuales y fuentes solo después del opt-in. La preferencia
apagada bloquea escrituras; apagarla borra las conversaciones voluntarias. Audio, foto
y ubicación puntual no se guardan en esas tablas. Los textos con pares de coordenadas
decimales se redactan antes de persistir. El historial permanece hasta que el titular
lo borra o desactiva; la API no promete un borrado automático por fecha.

## Voz e imágenes

`/ai/media/transcribe` acepta M4A/WAV/WebM de hasta 5 MB y usa el modelo
`gpt-4o-mini-transcribe` con clave exclusiva del servidor. El audio solo se mantiene
en memoria para la petición y el cliente borra su copia temporal. La transcripción se
presenta para revisión antes de enviar la pregunta. `/ai/media/photo` acepta
JPEG/PNG/WebP de hasta 4 MB, pide una descripción visual al modelo configurado y
compara nombres tentativos contra centros y establecimientos publicados. Nunca afirma
una coincidencia segura solo por la imagen. No se almacena la fotografía en la API.
Los límites por ruta acotan llamadas al proveedor; el límite global adicional es por IP.
La voz de salida lee el mismo texto que ve la persona y las fuentes permanecen visibles.

## Apoyo editorial

`POST /admin/ai/centers/:code/description` exige rol institucional y acceso a la ficha
propia o permiso administrativo. Solo envía nombre del borrador y descripción ingresada
al proveedor. Devuelve una sugerencia o revisión; la web la muestra antes de que la
persona la aplique en el formulario. La IA no guarda, aprueba ni publica fichas.

## Calidad

Mantener un conjunto de evaluaciones en español e inglés que mida exactitud, citas,
rechazo ante datos ausentes, geografía, accesibilidad, itinerarios imposibles y prompt
injection contenido en documentos.
