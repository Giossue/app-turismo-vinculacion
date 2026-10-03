# Agente turístico

## Personas y propósito

El turista autenticado pregunta por destinos, servicios, transporte y cómo llegar.
El agente responde con datos públicos verificables y propone acciones que el turista
confirma. El guía operativo `AGENTE_TURISTICO` puede solicitar ayuda de redacción y
revisión sobre sus propios borradores, sin delegar la publicación.

## Conversación turística

- La conversación textual admite español e inglés, texto parcial, detener, reintentar
  y comenzar de nuevo. Las preguntas de descubrimiento general funcionan sin GPS.
- Habla como un guía turístico: natural, amable y práctico. Responde en una a tres frases
  breves por defecto y amplía cuando se pide detalle o la pregunta lo requiere. No narra
  consultas a catastros, fichas, catálogos ni procesos de la app, ni añade ofrecimientos
  o preguntas por costumbre. Si necesita un dato, hace una sola pregunta concreta.
  Con tarjetas no repite su lista en el texto; la recomendación, la falta de resultados
  o el fallo de consulta se expresa de forma directa, sin inventar hechos.
- Una respuesta sobre un lugar contesta lo preguntado y adjunta su tarjeta:
  «Cómo llegar a X» indica «Pulsa Ver y luego Cómo llegar» con tarjeta de X;
  precio de entrada de X responde solo ese precio (o «No tengo el precio de la entrada»)
  con tarjeta de X; «Cuéntame sobre X» responde sobre X y adjunta su tarjeta.
  Para precios, horarios u otros detalles de un centro se consulta el detalle público;
  la búsqueda general no aporta esos datos. No añade otros lugares ni describe qué
  muestra la tarjeta. El chat no ofrece botones separados de abrir, preparar o iniciar ruta.
- Cada chat admite hasta veinte mensajes del usuario. El saludo y las respuestas del
  agente no cuentan. Al alcanzar veinte, se bloquean preguntas nuevas por texto o voz,
  se muestra el contador y se ofrece «Nuevo chat». Reintentar una respuesta fallida o
  repetir una consulta con ubicación reutiliza el mismo mensaje, sin consumir otro.
  Cerrar y reabrir la hoja conserva el contador; un chat nuevo lo reinicia.
- El botón «+» de nuevo chat se ubica arriba a la izquierda, en la misma fila que
  el cierre. El contador se ubica abajo a la derecha, justo encima del campo de mensaje.
- Las consultas rápidas usan filas compactas: tipografía de 14 puntos, iconos pequeños
  y menor espaciado, con un objetivo táctil mínimo de 44 puntos.
- El agente consulta el catálogo publicado antes de afirmar hechos turísticos y conserva
  la fuente concreta en la respuesta validada, o comunica que no encontró un dato
  verificable. El chat no muestra un pie «Fuentes».
- Las tarjetas muestran solo nombre, categoría, dirección/localidad y «Ver». No repiten
  descripción, teléfono ni distancia directa. La dirección usa «Lugar - Localidad» cuando
  ambos datos existen; los centros completan estos campos desde su ficha pública y el
  nombre de su cantón, sin inventar una ciudad. Si falta un dato se muestra el disponible;
  sin ninguno se indica «Ubicación no disponible». «Ver» abre los detalles completos.
  Una acción para abrir el mismo centro no repite el control de su tarjeta.
- La ubicación aproximada solo se usa si la persona activa ubicación y la consulta
  requiere cercanía o cálculo desde su posición. Se puede buscar por localidad sin GPS.
- Cuando la consulta comparte ubicación para cercanía o llegada, las tarjetas de lugares
  incluyen una fila adaptable con iconos y tiempos estimados en carro, a pie y en bici,
  en ese orden. Una consulta general como «restaurantes en Guaranda» no comparte GPS ni
  muestra tiempos, aunque el mapa ya tenga la posición. «Restaurantes cerca de mí» o
  «¿Cuánto tardo en llegar?» sí requieren la ubicación. Los tiempos se calculan por la red
  vial de cada modo desde la ubicación aproximada del visitante, sin tráfico en tiempo
  real. La distancia directa sirve para buscar candidatos; no se convierte en minutos
  ni determina el tiempo mostrado. El orden de los lugares se conserva.
- Preguntas como «¿A cuántos minutos está?» o «¿Cuánto tiempo tardo en llegar?» necesitan
  una posición puntual. Si el permiso ya existe, la app intenta una lectura fresca; si
  falta ubicación, ofrece «Usar mi ubicación» y repite la pregunta al obtenerla. Consultar
  tiempos no inicia una ruta ni seguimiento.
- Cada modo muestra su duración o un estado explícito: «Sin ruta» si no hay recorrido,
  «No disponible» si el proveedor falla, la respuesta no es válida o el destino carece
  de coordenadas. Un fallo de un modo no oculta las estimaciones válidas de los demás.
  Una respuesta anterior sin tiempos sigue siendo válida y no genera minutos inventados.
- Las tarjetas abren fichas públicas. Una ruta es propuesta y siempre pide confirmación.
- «Cómo llego/llegar a X» busca el destino sin requerir GPS; «Ver» abre sus detalles y
  «Cómo llegar» lleva al flujo de ruta existente. Cercanía y tiempos desde el visitante
  sí necesitan posición; cuando falta, «Usar mi ubicación» es el único control adicional.
- Los nombres, orden y códigos públicos de los lugares mostrados se incorporan al
  contexto interno del siguiente turno para preguntas como «la entrada del primero».
  No alteran el texto visible ni la voz. El destino se consulta nuevamente antes de
  afirmar hechos; no se reenvían coordenadas, contactos ni direcciones de cards como
  contexto y se mantienen los límites de mensajes y contenido del contrato.
- La función de planes e itinerarios está retirada: no hay consulta rápida, tarjetas,
  guardado ni edición. Ante una petición de plan, el agente informa que no está disponible
  y ofrece búsqueda de lugares o una ruta a un destino.

## Persistencia y multimedia

- La app no muestra un historial de conversaciones ni permite restaurarlas: solo
  muestra el chat actual en memoria y la acción para comenzar uno nuevo. La API conserva
  sus operaciones de historial consentido y borrado para cuentas que lo activaron; esta
  retirada visual no borra registros ni guarda ubicación puntual o audio.
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
