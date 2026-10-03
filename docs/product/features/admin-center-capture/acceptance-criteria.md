# Criterios de aceptación

- Un administrador puede crear una ficha con los campos mínimos y obtiene un código
  institucional derivado por PostgreSQL.
- Guardar cambios incrementa la versión del borrador y no cambia la ficha pública.
- Enviar a revisión bloquea la edición hasta aprobar/publicar o devolver para corregir.
- Devolver exige un motivo, conserva la observación y deja el borrador editable en `BORRADOR`.
- «Aprobar y publicar» aplica el snapshot revisado, multimedia y valoración, actualiza la
  fecha pública y registra aprobación/publicación en una sola transacción.
- Un error de publicación revierte toda la decisión, conserva `EN_REVISION` y la versión pública anterior.
- Dos decisiones simultáneas no publican ni devuelven la misma propuesta dos veces.
- Editar una ficha publicada mantiene visible la versión anterior hasta la publicación.
- Si el borrador no contiene una sección, el editor conserva allí la información publicada no reemplazada; los valores propuestos del borrador prevalecen cuando existen.
- En la API, desactivar oculta la ficha del catálogo público sin cambiar su estado editorial;
  reactivar conserva ese estado y su historial. Aprobar no reactiva una ficha desactivada.
- Inventario y filtros muestran tres estados. La activación no se presenta en tabla,
  filtros, editor, resumen de ficha ni resumen general de centros.
- Los enlaces antiguos con `active` descartan ese filtro sin perder estado, búsqueda ni página.
- La cola incluye sólo `EN_REVISION`; aprobar/publicar o devolver retira la propuesta de la cola.
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
