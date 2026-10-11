# Colecciones, filtros y paginación

El móvil usa listas, tarjetas y capas de mapa; una tabla administrativa pertenece
al panel MUI separado. Evitar introducir un grid de escritorio en React Native.

Para listados de API, respetar DTOs, paginación y filtros admitidos; no presentar
un ordenamiento local como orden global de todas las páginas. Acotar viewport,
radio y cantidad en el servidor para búsquedas geográficas.

Preservar búsqueda, selección y filtros al abrir un detalle. Un filtro oculto
pero activo debe seguir reconocido. Carga, vacío, error y resultado parcial son
estados distintos. Las listas largas requieren virtualización y medición antes
de una optimización que cambie experiencia.

Los catastros del mapa usan teselas vectoriales y filtros de capa. No sustituirlos
por una lista JSON por viewport. El detalle usa propiedades públicas del feature
y sus consultas autorizadas cuando corresponda.

El panel conserva DataGrid MUI y tarjetas adaptables. La API aplica visibilidad,
propiedad y estado incluso si un consumidor omite sus filtros visuales.
