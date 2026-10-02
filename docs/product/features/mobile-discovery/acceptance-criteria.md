# Criterios de aceptación

- [x] La aplicación se analiza y prueba con TypeScript local.
- [x] El listado solo representa el contrato público de la API.
- [x] Carga, vacío, error y reintento son distinguibles y accesibles.
- [x] Abrir Explorar, escribir o filtrar no solicita ubicación foreground. «Mi ubicación»
      puede solicitarla; si se deniega, el mapa sigue disponible. La sesión autorizada
      espera una lectura fresca con precisión de 100 m o menos,
      mantiene un watcher mientras la app está activa y no persiste coordenadas históricas.
- [x] El mapa en línea representa centros públicos confirmados desde la API y catastros
      publicados mediante teselas; los manifiestos descargados no sustituyen esas capas.
- [x] La búsqueda consulta desde dos caracteres con debounce remoto de 300 ms; no requiere
      enviar desde el teclado.
- [x] Los resultados se listan debajo del campo dentro de la interfaz de búsqueda;
      escribir o enviar no abre un bottom sheet de resultados.
- [x] Los filtros «Todo», «Atractivos», «Servicios» y «Lugares» comparten el mismo campo.
- [x] «Todo Ecuador» es el alcance inicial y «En esta zona» utiliza el bbox real del mapa,
      capturado al estar listo y después del movimiento, sin lecturas por cada frame.
- [x] Una zona sin viewport válido espera y no ejecuta una búsqueda nacional accidental.
- [x] La API valida el bbox completo y respeta el filtro de tipo en las fuentes propias
      y geográficas, sin fallback automático a otra ciudad.
- [x] Tildes y mayúsculas no impiden coincidencias; los grupos definidos de sinónimos y
      errores pequeños amplían la búsqueda sin modificar la clasificación institucional.
- [x] Las coincidencias exactas y la relevancia preceden a la distancia directa.
      La búsqueda no muestra ni calcula minutos de viaje.
- [x] Seleccionar un centro o catastro abre su ficha; una referencia geográfica centra
      el mapa. Las coincidencias locales abren el visor de la ciudad descargada.
- [x] Sin red o ante error remoto se buscan únicamente datos descargados disponibles
      y se comunica la cobertura por ciudad, sin prometer Ecuador completo o provincias.
- [x] Los cambios de consulta no dejan resultados obsoletos en la lista ni persisten
      claves con coordenadas o bbox. Las búsquedas recientes guardan solo texto borrable.
- [x] Limpiar la consulta restaura el mapa general y el acceso al menú.
- [x] La búsqueda consulta campos públicos de atractivos, catastros y referencias
      geográficas; no expone identificadores fiscales ni otros datos internos.
- [x] Si el permiso se deniega, el GPS está apagado o la señal falla, el mapa, la búsqueda
      y los filtros continúan disponibles.
- [x] Una posición `lastKnown` o una muestra con precisión superior a 100 m no se muestra
      como ubicación actual ni se usa para iniciar una ruta.
- [x] Las rutas y la navegación giro a giro real continúan fuera de alcance de esta
      feature y se habilitan en una sesión de navegación separada.
- [ ] Mover o acercar el mapa no muestra indicador de carga por los catastros: llegan como
      teselas vectoriales cacheadas y solo se descargan las que entran en pantalla.
- [ ] Con el mapa alejado los catastros se ven como puntos agregados; tocarlos acerca el
      mapa hasta ver sus pines. Los chips filtran sin nuevas peticiones.
