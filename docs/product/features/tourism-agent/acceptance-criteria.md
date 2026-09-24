# Criterios de aceptación del agente turístico

- [ ] Desde el teléfono, «¿Qué lugares turísticos puedo visitar?» sin GPS devuelve
      centros publicados con tarjetas y fuentes, o una ausencia real del catálogo.
- [ ] «¿Qué hay cerca de mí?» usa una posición puntual aproximada solo si está
      disponible; sin ella ofrece búsqueda por localidad y no inventa distancia.
- [ ] Preguntas de comida, hospedaje, transporte, acceso y horarios consultan sus
      registros públicos; datos no publicados o inexistentes se expresan como ausencia.
- [ ] Una propuesta de ruta no navega sin confirmación y sus métricas vienen del
      proveedor vial. Un itinerario guarda jornadas y paradas del titular y se puede
      recuperar, editar y borrar.
- [ ] El historial requiere activación explícita; solo el titular accede o borra, y
      ningún registro guarda coordenadas, audio o fotografía de la consulta.
- [ ] Voz: permiso denegado, silencio, cancelación, red interrumpida y reproducción
      detenida conservan el chat textual utilizable y sus fuentes.
- [ ] Foto: cámara/galería, formato o tamaño inválido, falta de coincidencia y fallo
      del proveedor presentan estados comprensibles; no se conserva el archivo.
- [ ] El guía puede generar sugerencias sobre un borrador propio y rechazarlas o
      aplicarlas manualmente; turista/guía no pueden aprobar ni publicar mediante IA.
- [ ] Evaluaciones cubren fuentes, datos ausentes, geografía, accesibilidad,
      itinerarios inviables e instrucciones inyectadas en contenidos publicados.
- [ ] API y móvil pasan formato, lint, tipos y pruebas; el flujo principal funciona
      en la build de desarrollo Android conectada por ADB.
