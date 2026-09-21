# Criterios de aceptación

- Un administrador puede crear una ficha con los campos mínimos y obtiene un código
  institucional derivado por PostgreSQL.
- Guardar cambios incrementa la versión del borrador y no cambia la ficha pública.
- Enviar a revisión bloquea la edición hasta aprobar o rechazar.
- Rechazar conserva la observación y permite corregir el borrador.
- Aprobar habilita la acción de publicar y mantiene la ficha visible en la cola con estado aprobado; publicar actualiza la ficha pública y su fecha.
- Editar una ficha publicada mantiene visible la versión anterior hasta la publicación.
- Desactivar oculta la ficha del catálogo público; reactivar conserva su historial.
- El panel permite seleccionar actividades compatibles con la categoría del atractivo.
- El panel permite registrar condiciones de accesibilidad y facilidades.
- Publicar aplica esas relaciones junto con el núcleo y conserva la auditoría.
- El panel permite cargar fotos, video y audio multipart con MIME, firma y tamaño válidos.
- Cada archivo queda pendiente hasta publicar la ficha, registra autor/fuente y puede
  eliminarse lógicamente sin borrar la auditoría.
- Una foto publicada aparece en el detalle móvil; un archivo pendiente nunca se expone al
  turista.
- El administrador puede cambiar el nombre o disponibilidad de catálogos técnicos y la
  API registra el cambio sin permitir mutaciones a la auditoría.
- Un usuario `TURISTA` recibe `403` en todas las rutas administrativas.
- Cada acción relevante aparece en la auditoría con actor, fecha y datos de cambio.
