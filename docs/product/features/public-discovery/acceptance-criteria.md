# Criterios de aceptación: descubrimiento público completo

- [x] Solo centros activos y publicados aparecen en lista, mapa y ficha.
- [x] Texto, clasificación, DPA y jerarquía filtran en el backend con entradas validadas.
- [x] La ficha no filtra datos internos ni rutas de almacenamiento.
- [x] Móvil y web muestran carga, vacío, error y reintento; explorar no requiere GPS.
- [x] Ficha abre desde tarjeta o marcador y maneja 404.
- [x] Contratos, pruebas y documentación se actualizan con el mismo comportamiento.
- [x] El campo muestra coincidencias en vivo desde dos caracteres con debounce remoto
      de 300 ms, sin abrir una hoja inferior de resultados ni pedir permiso GPS.
- [x] Los filtros de tipo y el alcance «En esta zona»/«Todo Ecuador» se aplican a las
      fuentes públicas; una zona vacía no se amplía automáticamente a otra ciudad.
- [x] Tildes, grupos definidos de sinónimos y errores pequeños amplían coincidencias;
      la relevancia tiene prioridad sobre la distancia directa.
- [x] Sin conexión la búsqueda declara únicamente cobertura de ciudades descargadas
      y abre las coincidencias locales desde su visor, sin fichas remotas ni tiempos inventados.
