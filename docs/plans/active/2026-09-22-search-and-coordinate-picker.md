# Búsqueda móvil y selector de coordenadas

## Objetivo

Permitir que la aplicación móvil busque los centros turísticos y catastros propios,
complementando los resultados con calles, ciudades y lugares geográficos de Ecuador desde
Photon. En el panel administrativo, reemplazar la captura manual de latitud/longitud por un
selector de mapa dentro de un diálogo, sin convertir el mapa en un editor de direcciones.

## Alcance de esta unidad

- API pública `GET /api/v1/search?q=...`.
- Resultados internos publicados/activos y resultados Photon limitados a `EC`.
- Degradación: si Photon no responde, los resultados internos continúan disponibles.
- Mobile: consulta con TanStack Query, resultados geográficos distinguibles y selección para
  centrar el mapa; los centros propios abren su ficha.
- Admin: componente MapLibre GL JS reutilizable en un diálogo para centro y catastro; click
  en el mapa actualiza latitud y longitud y requiere confirmar antes de cerrar.

## Reglas

- El móvil nunca llama directamente a Photon; el backend conserva el proveedor y el timeout.
- La API no expone IDs internos en la presentación móvil; solo códigos públicos de centros y
  una clave opaca para resultados de catastro cuando sea necesaria.
- Solo centros `PUBLICADO` y activos, y catastros `PUBLICADO` y activos, entran en resultados.
- Photon usa siempre `countrycode=EC` y los resultados externos no se convierten en fichas
  propias.
- La selección administrativa valida rangos de coordenadas y usa la misma fuente de verdad
  del formulario antes de guardar.

## Verificación

- [x] Tests unitarios del adaptador Photon y del contrato de búsqueda.
- [x] Tests de API para resultados internos, resultados externos y fallo de Photon.
- [x] Typecheck/lint/test de API y mobile.
- [x] Typecheck/lint/build del panel administrativo.
- [x] `git diff --check` en ambos repositorios.
