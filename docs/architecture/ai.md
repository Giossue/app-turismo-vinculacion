# Arquitectura de inteligencia artificial

## Objetivo

Chat turístico, recomendaciones y apoyo de redacción/validación para guías.
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
móvil. La respuesta final contiene `text`, `cards`, `actions` y
`sources`.

Las herramientas allowlisted de esta unidad son `listPublishedCenters`,
`searchPublishedEstablishments`, `searchPublishedCenters`,
`getPublishedCenter`, `searchNearbyEstablishments`,
`searchNearbyPublishedPlaces`, `requestLocationAccess`, `getPublishedTransportForCenter`,
`searchNearbyTransportStops`, `getTravelTimes` y `calculateRoadRoute`. Las consultas de cercanía usan PostGIS sobre centros publicados,
POI activos y establecimientos activos; `searchNearbyPublishedPlaces` recibe únicamente radio,
límite y categoría opcional, mientras que las coordenadas se toman del contexto aproximado del
request. La intención cercana detectada en español obliga a ejecutar esa herramienta en el
primer paso para evitar convertir “cerca de mí” en una búsqueda textual. Las primeras tools
delegan en repositorios públicos y el modelo solo recibe referencias opacas de resultados; el
backend rehidrata/sanitiza tarjetas, fuentes y destinos y no acepta coordenadas ni
detalles escritos por el modelo. `calculateRoadRoute` solo recibe referencias emitidas por otras
tools y delega el cálculo al proveedor vial existente; devuelve distancia, duración e
instrucciones acotadas, sin exponer geometría al modelo. Desde la ubicación del visitante marca
el origen como aproximado y la app recalcula antes de navegar.

Cuando la petición incluye ubicación aproximada, las búsquedas, listas y fichas agregan
`travelTimes` a los resultados verificados antes de entregarlos al modelo. La herramienta
`getTravelTimes` acepta únicamente referencias opacas de lugares recuperados durante el
turno y devuelve las estimaciones del mismo servicio. El cálculo usa OSRM Table por los
tres perfiles viales y comparte lotes para un máximo de seis destinos únicos por turno;
la caché por coordenadas existe solo dentro de la petición. No envía geometría al modelo,
no usa Haversine ni convierte distancia directa en minutos, y no cambia el orden de las
recomendaciones por duración.

Cada tarjeta puede contener `travelTimes`, una lista de exactamente tres entradas con
modos únicos `car`, `foot` y `bicycle`. Un estado `available` requiere `durationSeconds`
y `distanceMeters` finitos y no negativos; `no_route` y `unavailable` no contienen métricas.
Las tarjetas se rehidratan desde ese resultado confiable: el modelo no aporta minutos ni
sobrescribe las estimaciones. La app indica que proceden de una ubicación aproximada y
que son estimaciones; el proveedor no incluye tráfico en tiempo real. Consultar tiempos
no inicia navegación ni registra una trayectoria.

En una consulta de cercanía o tiempo de llegada sin coordenada, `requestLocationAccess` devuelve una
intención `request_location` para el cliente móvil. El backend no puede abrir el
diálogo del sistema ni conocer el estado de permisos del teléfono. El móvil intenta
una lectura nueva si el permiso ya está concedido; si falta, muestra la acción
«Usar mi ubicación», que solicita el permiso o la lectura y repite esa pregunta.
Preguntar por minutos o tiempo para llegar activa este flujo aunque no diga «cerca de
mí»; un destino nombrado sigue resolviéndose por su búsqueda de catálogo.
La API no envía texto parcial en este caso y responde de forma estable aunque el
modelo no produzca una respuesta estructurada.

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
Texto y tarjetas son partes distintas de la misma respuesta estructurada: el transporte SSE
no duplica registros. El prompt pide un resumen breve cuando hay tarjetas; el cliente
elimina del texto visible solo las viñetas que vuelven a nombrar esas tarjetas, sin
modificar la respuesta original que se usa como contexto e historial.
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

## Retirada de planes

La función de planes e itinerarios se retiró. La API no registra `/ai/itineraries`,
el contrato de chat no admite `itinerary` y el modelo no recibe herramientas de
planificación. Ante una solicitud de plan, se indica que no está disponible y se
ofrece buscar lugares o preparar una ruta a un destino. La app no muestra «Mis planes»
ni permite guardar o editar itinerarios.

Las migraciones y datos históricos se conservan sin acceso desde la app; esta retirada
no ejecuta borrados de base de datos. La API debe actualizarse antes o junto con el
móvil, porque el nuevo cliente rechaza respuestas antiguas con `itinerary`. OpenAPI
se genera desde los controladores actuales y ya no anuncia este campo ni sus endpoints.

## Historial

El móvil no visualiza ni restaura conversaciones históricas. Solo mantiene el chat
actual en memoria, con hasta veinte mensajes del usuario; un chat nuevo reinicia ese
límite. Reintentar o repetir con GPS reutiliza el turno. El contexto enviado al modelo
sigue acotado a doce entradas y no representa el contador del chat. Los endpoints y
registros de historial consentido se conservan en la API; retirar su vista no los borra.

`/ai/history` guarda turnos textuales y fuentes solo después del opt-in. La preferencia
apagada bloquea escrituras; apagarla borra las conversaciones voluntarias. Audio
y ubicación puntual no se guardan en esas tablas. Los textos con pares de coordenadas
decimales se redactan antes de persistir. El historial permanece hasta que el titular
lo borra o desactiva; la API no promete un borrado automático por fecha.

## Voz

`/ai/media/transcribe` acepta M4A/WAV/WebM de hasta 5 MB y usa el modelo
`gpt-4o-mini-transcribe` con clave exclusiva del servidor. El audio solo se mantiene
en memoria para la petición y el cliente borra su copia temporal. La transcripción se
presenta para revisión antes de enviar la pregunta. El agente no acepta imágenes:
no existe una ruta de análisis de fotos en la API.
Los límites por ruta acotan llamadas al proveedor; el límite global adicional es por IP.
La voz de salida lee el mismo texto que ve la persona y las fuentes permanecen visibles.

## Apoyo editorial

`POST /admin/ai/centers/:code/description` exige rol institucional y acceso a la ficha
propia o permiso administrativo. Solo envía nombre del borrador y descripción ingresada
al proveedor. Devuelve una sugerencia o revisión; la web la muestra antes de que la
persona la aplique en el formulario. La IA no guarda, aprueba ni publica fichas.

## Calidad

Mantener un conjunto de evaluaciones en español e inglés que mida exactitud, citas,
rechazo ante datos ausentes, geografía, accesibilidad y prompt
injection contenido en documentos.
