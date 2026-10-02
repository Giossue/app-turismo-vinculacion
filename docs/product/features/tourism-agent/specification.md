# Agente turístico

## Personas y propósito

El turista autenticado pregunta por destinos, servicios, transporte y cómo llegar.
El agente responde con datos públicos verificables y propone acciones que el turista
confirma. El guía operativo `AGENTE_TURISTICO` puede solicitar ayuda de redacción y
revisión sobre sus propios borradores, sin delegar la publicación.

## Conversación turística

- La conversación textual admite español e inglés, texto parcial, detener, reintentar
  y comenzar de nuevo. Las preguntas de descubrimiento general funcionan sin GPS.
- El agente consulta el catálogo publicado antes de afirmar hechos turísticos; presenta
  la entidad y fuente concreta, o comunica que no encontró un dato verificable.
- La ubicación aproximada solo se usa si la persona activa ubicación y la consulta
  requiere cercanía o cálculo desde su posición. Se puede buscar por localidad sin GPS.
- Las tarjetas abren fichas públicas. Una ruta es propuesta y siempre pide confirmación.
- La función de planes e itinerarios está retirada: no hay consulta rápida, tarjetas,
  guardado ni edición. Ante una petición de plan, el agente informa que no está disponible
  y ofrece búsqueda de lugares o una ruta a un destino.

## Persistencia y multimedia

- Guardar historial es opt-in y reversible. La persona puede ver y borrar sus
  conversaciones; la ubicación puntual y el audio no se persisten en el historial.
- El turista puede hablar, revisar la transcripción antes de enviar y escuchar la
  respuesta. Puede detener grabación y reproducción; un permiso denegado deja texto.
- El chat del agente acepta texto y voz; no ofrece cámara, galería ni envío de
  imágenes. Las fotografías de las fichas publicadas siguen visibles en la app.

## Seguridad y degradación

La API valida, autentica y limita cada operación. El modelo no tiene SQL ni herramientas
genéricas, no accede a borradores turísticos en el chat público y no ejecuta mutaciones.
Los proveedores externos pueden fallar; el mapa, las fichas y los controles siguen
disponibles, y los errores del proveedor no exponen secretos.

## Fuera del dominio del agente

Reservas, pagos, publicación autónoma, aprobación administrativa y seguimiento de
unidades de transporte sin fuente autorizada.
