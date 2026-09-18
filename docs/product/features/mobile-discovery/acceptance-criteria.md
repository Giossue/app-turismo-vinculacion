# Criterios de aceptación

- [x] La aplicación se analiza y prueba con TypeScript local.
- [x] El listado solo representa el contrato público de la API.
- [x] Carga, vacío, error y reintento son distinguibles y accesibles.
- [x] Al abrir Explorar no se solicita ubicación; el control “mi ubicación” la pide de
      forma explícita y no persiste coordenadas históricas.
- [x] MapLibre recibe exclusivamente marcadores publicados desde la API.
- [x] La búsqueda se ejecuta únicamente al enviar desde el teclado y no antes de dos
      caracteres.
- [x] Los resultados se muestran en un bottom sheet deslizable, conservan el mapa visible
      y permiten abrir la ficha del atractivo seleccionado.
- [x] Limpiar la consulta restaura el mapa general y el acceso al menú.
- [x] La búsqueda solo consulta nombre, descripción y clasificación de atractivos publicados.
- [x] Si el permiso se deniega, el GPS está apagado o la señal falla, el mapa, la búsqueda
      y los filtros continúan disponibles.
- [x] Las rutas y la navegación giro a giro real continúan fuera de alcance de esta
      feature y se habilitan en una sesión de navegación separada.
