# Criterios de aceptación

- [x] La aplicación se analiza y prueba con TypeScript local.
- [x] El listado solo representa el contrato público de la API.
- [x] Carga, vacío, error y reintento son distinguibles y accesibles.
- [x] Al abrir Explorar se solicita ubicación foreground; si se deniega, el mapa sigue
      disponible. La sesión espera una lectura fresca con precisión de 100 m o menos,
      mantiene un watcher mientras la app está activa y no persiste coordenadas históricas.
- [x] MapLibre recibe exclusivamente marcadores publicados desde la API.
- [x] La búsqueda se ejecuta únicamente al enviar desde el teclado y no antes de dos
      caracteres.
- [x] Los resultados se muestran en un bottom sheet deslizable, conservan el mapa visible
      y permiten abrir la ficha del atractivo seleccionado.
- [x] Limpiar la consulta restaura el mapa general y el acceso al menú.
- [x] La búsqueda solo consulta nombre, descripción y clasificación de atractivos publicados.
- [x] La búsqueda permite cambiar a servicios cercanos y consultar el catastro por actividad
      usando una ubicación puntual autorizada.
- [x] El resultado de catastro comunica fallback, localidad efectiva y distancia aproximada
      sin exponer identificadores fiscales.
- [x] Si el permiso se deniega, el GPS está apagado o la señal falla, el mapa, la búsqueda
      y los filtros continúan disponibles.
- [x] Una posición `lastKnown` o una muestra con precisión superior a 100 m no se muestra
      como ubicación actual ni se usa para iniciar una ruta.
- [x] Las rutas y la navegación giro a giro real continúan fuera de alcance de esta
      feature y se habilitan en una sesión de navegación separada.
