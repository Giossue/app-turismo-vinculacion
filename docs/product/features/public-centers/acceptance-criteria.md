# Criterios de aceptación

- [x] Un visitante obtiene solo centros activos `PUBLICADO` sin iniciar sesión.
- [x] La API admite texto, límite y viewport completo; rechaza viewport parcial o inválido.
- [x] La ficha se localiza por código público y no expone el ID interno.
- [x] La interfaz informa estados vacío, 404 y error de carga.
- [x] El diseño mantiene enlace, foco y objetivos táctiles visibles.
- [x] La consulta espacial y de texto se parametriza en el backend.
- [x] La búsqueda textual coincide con nombre, descripción y clasificación, y solo devuelve
      centros activos publicados.
- [x] Existe prueba unitaria del caso de uso y verificación de integración local (`q=mirador`)
  ejecutada contra la API.
- [x] OpenAPI se genera desde los controladores y la especificación está documentada.
- [x] En móvil, un marcador abre una ficha inferior con resumen y permite expandirla para
  consultar el detalle público disponible sin navegar a otra pantalla.
- [x] Al seleccionar un marcador, la cámara centra el punto con zoom predeterminado y el
  pin usa un color de selección distinguible antes de mostrar la ficha.
- [x] La búsqueda móvil se envía desde el teclado, muestra coincidencias en un bottom sheet
  y conserva el mapa visible.
