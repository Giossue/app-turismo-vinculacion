# Criterios: mapas sin conexión

- [x] El manifiesto incluye cobertura, centros publicados, POIs públicos y catastros
      publicados, sin registros privados ni datos fiscales.
- [x] La consulta de ciudad no trunca silenciosamente los establecimientos.
- [x] Una ciudad sin límite ni coordenadas falla de forma explícita.
- [x] Abrir, buscar y consultar fichas en el visor usa únicamente el paquete local.
- [x] El listado local no depende del catálogo remoto ni de su TTL.
- [x] Estilo, URLs de recursos y fuentes compatibles se conservan tras reiniciar.
- [x] Actualizar guarda el nuevo paquete antes de borrar el anterior; fallos conservan
      la descarga anterior.
- [x] Borrar un mapa de ciudad tiene estados de trabajo y error recuperable.
- [x] Los recorridos institucionales se dibujan y no inventan giros de navegación.
- [x] Los recorridos publicados se incluyen en el mapa; no hay acción ni listado para
      descargar rutas calculadas individuales.
- [x] El panel de ruta identifica el modo mediante pestañas sin título repetido ni
      leyenda «Ruta más rápida».
- [x] Un fallo de recálculo online conserva la ruta y ofrece reintento manual.
- [ ] Descargar un paquete institucional publicado y reabrir el visor en modo avión en
      Android/iOS reales, incluido reinicio, zoom y cambio de tema.
- [ ] Descargar un mapa provincial completo con límite oficial y paquete publicado.

Los criterios marcados se refieren al código y sus pruebas automatizadas. La comprobación
en dispositivos y la publicación de un primer paquete se registran por separado.
