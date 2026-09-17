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

La primera integración expone `POST /api/v1/ai/chat` como texto en streaming. El backend
usa AI SDK Core (`streamText`) y selecciona OpenAI o Anthropic con `AI_PROVIDER` y
`AI_MODEL`; las claves `OPENAI_API_KEY` y `ANTHROPIC_API_KEY` nunca llegan a la aplicación
móvil. La única herramienta habilitada en esta primera unidad es
`searchPublishedCenters`, que delega en el repositorio público y por tanto solo devuelve
fichas aprobadas.

## Herramientas permitidas

- Buscar centros/POI/establecimientos publicados.
- Consultar ficha pública.
- Buscar por radio y filtros.
- Consultar rutas, paradas y horarios.
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
