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

La primera integración expone `POST /api/v1/ai/chat` como JSON estructurado. El backend
usa AI SDK Core (`generateText` + `Output.object`) y selecciona OpenAI o Anthropic con
`AI_PROVIDER` y `AI_MODEL`; las claves `OPENAI_API_KEY` y `ANTHROPIC_API_KEY` nunca llegan a
la aplicación móvil. La respuesta contiene `text`, `cards`, `itinerary` opcional, `actions` y `sources`.

Las herramientas allowlisted de esta unidad son `searchPublishedCenters`,
`findItineraryCandidates`, `getPublishedCenter`, `searchNearbyEstablishments`,
`searchNearbyPublishedPlaces`, `getPublishedTransportForCenter`,
`searchNearbyTransportStops` y `calculateRoadRoute`. Las consultas de cercanía usan PostGIS sobre centros publicados,
POI activos y establecimientos activos; `searchNearbyPublishedPlaces` recibe únicamente radio,
límite y categoría opcional, mientras que las coordenadas se toman del contexto aproximado del
request. La intención cercana detectada en español obliga a ejecutar esa herramienta en el
primer paso para evitar convertir “cerca de mí” en una búsqueda textual. El modelo solo recibe
referencias de resultados y el backend rehidrata/sanitiza tarjetas, itinerarios, fuentes y
destinos; no acepta coordenadas ni detalles escritos por el modelo. `calculateRoadRoute` solo
recibe referencias emitidas por otras tools y delega el cálculo al proveedor vial existente;
devuelve distancia, duración e instrucciones acotadas, sin exponer geometría al modelo. Desde la
ubicación del visitante marca el origen como aproximado y la app recalcula antes de navegar.

Los POI no tienen código público en el esquema actual: se representan internamente con una
referencia opaca por solicitud y la respuesta solo contiene nombre, descripción, localidad y
coordenadas públicas. Las acciones `start_route` pueden apuntar a un POI, establecimiento o
centro, pero la navegación continúa requiriendo confirmación móvil.

Las herramientas de transporte consultan rutas, cooperativas, tipos, paradas, horarios y
asociaciones reales. Si las tablas operativas no tienen registros, devuelven una ausencia
explícita (“no hay rutas/paradas/horarios publicados”) y nunca inventan frecuencia, precio ni
duración.
Las acciones son intenciones: `start_route` siempre exige confirmación explícita en el
móvil y no ejecuta navegación desde la API.

## Herramientas permitidas

- Buscar centros/POI/establecimientos publicados.
- Consultar ficha pública.
- Buscar por radio y filtros.
- Consultar rutas, paradas y horarios publicados, sin rellenar ausencias.
- Calcular rutas viales verificadas entre lugares registrados y validar distancia/duración.
- Proponer itinerario y validarlo contra horarios/distancias.
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

## Voz e imágenes

Agregar después del chat textual. Audio e imágenes pasan por límites de tamaño, tipo,
consentimiento, moderación y retención. Las respuestas de voz conservan transcripción y
fuentes equivalentes al texto.

## Calidad

Mantener un conjunto de evaluaciones en español e inglés que mida exactitud, citas,
rechazo ante datos ausentes, geografía, accesibilidad, itinerarios imposibles y prompt
injection contenido en documentos.
