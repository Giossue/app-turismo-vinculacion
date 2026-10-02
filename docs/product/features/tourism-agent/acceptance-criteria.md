# Criterios de aceptación del agente turístico

- [ ] Desde el teléfono, «¿Qué lugares turísticos puedo visitar?» sin GPS devuelve
      centros publicados con tarjetas y fuentes, o una ausencia real del catálogo.
- [ ] «¿Qué hay cerca de mí?» usa una posición puntual aproximada solo si está
      disponible; sin ella ofrece búsqueda por localidad y no inventa distancia.
- [ ] Con ubicación, las tarjetas muestran iconos y tiempos en el orden carro, a pie,
      bici, desde la posición aproximada. Los minutos provienen del recorrido vial de
      cada modo, nunca de la distancia directa ni de una velocidad fija del agente.
- [ ] «¿A cuántos minutos está?» y «¿Cuánto tiempo tardo en llegar?» intentan obtener
      una lectura fresca con permiso concedido, o permiten usar ubicación y repetir el
      mismo turno. Preguntar por un destino nombrado conserva la búsqueda de ese destino.
- [ ] La duración cero válida muestra «<1 min»; los modos sin recorrido muestran «Sin
      ruta» y los fallos del proveedor «No disponible». Un modo fallido no borra los
      tiempos disponibles, ni inicia navegación o modifica el orden de los lugares.
- [ ] La API admite como máximo seis destinos únicos por turno. El contrato rechaza
      tiempos negativos/no finitos, métricas en estados sin ruta y modos repetidos o
      faltantes; el móvil admite respuestas anteriores sin `travelTimes`.
- [ ] El lector de pantalla anuncia los tiempos o estados de los tres modos al enfocar
      una tarjeta, junto con la indicación de ubicación aproximada.
- [ ] Preguntas de comida, hospedaje, transporte, acceso y horarios consultan sus
      registros públicos; datos no publicados o inexistentes se expresan como ausencia.
- [ ] Una propuesta de ruta no navega sin confirmación y sus métricas vienen del
      proveedor vial.
- [ ] El agente no ofrece planes ni itinerarios: no hay consulta rápida ni «Mis planes»,
      la respuesta estructurada no acepta `itinerary` y `/ai/itineraries` no está expuesto.
      Buscar lugares y preparar rutas individuales sigue disponible.
- [ ] La app no muestra botón ni panel de historial, ni restaura conversaciones guardadas.
- [ ] El chat acepta el vigésimo mensaje del usuario y bloquea el vigesimoprimero por
      texto, voz y consultas rápidas; presenta el contador y la acción «Nuevo chat».
      El saludo y las respuestas no cuentan; fallos y respuestas detenidas sí conservan
      el mensaje enviado. Reintentar o repetir con GPS no duplica ni consume un mensaje.
- [ ] Cerrar y reabrir la hoja conserva el límite; «Nuevo chat» y cambiar de cuenta
      reinician el contador. El contexto enviado al modelo sigue acotado a doce entradas.
- [ ] El historial de la API sigue requiriendo consentimiento; solo el titular accede
      o borra y ningún registro guarda coordenadas o audio de la consulta.
- [ ] Voz: permiso denegado, silencio, cancelación, red interrumpida y reproducción
      detenida conservan el chat textual utilizable y sus fuentes.
- [ ] El chat del agente no muestra cámara ni galería; la API no acepta fotos
      para análisis, incluso si las envía una versión anterior de la app.
- [ ] El guía puede generar sugerencias sobre un borrador propio y rechazarlas o
      aplicarlas manualmente; turista/guía no pueden aprobar ni publicar mediante IA.
- [ ] Evaluaciones cubren fuentes, datos ausentes, geografía, accesibilidad,
      instrucciones inyectadas en contenidos publicados.
- [ ] API y móvil pasan formato, lint, tipos y pruebas; el flujo principal funciona
      en la build de desarrollo Android conectada por ADB.
