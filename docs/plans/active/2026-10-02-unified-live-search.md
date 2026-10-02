# Búsqueda unificada con resultados al escribir

## Objetivo

Buscar centros turísticos, establecimientos y referencias geográficas desde un
campo, con resultados listados debajo del campo mientras se escribe. Enviar una
búsqueda no abre una hoja inferior ni añade entradas al historial de navegación.

## Alcance

- Campo único con filtros opcionales de tipo y alcance zona visible/Ecuador.
- Sugerencias remotas con debounce, cancelación y descarte de respuestas antiguas.
- Coincidencias sin tildes, errores leves y alias acotados de categorías.
- Orden común por coincidencia/relevancia y cercanía para todos los tipos.
- Zona obtenida del viewport real de MapLibre, sin solicitar GPS al escribir.
- Integrar lugares y recorridos publicados de mapas descargados al mismo listado,
  indicando ciudades de cobertura cuando se usan resultados locales.
- Mantener selección de fichas, navegación, GPS, permisos y datos públicos.
- Sin nuevas dependencias, proveedor, motor de rutas offline ni cambios destructivos.

## Coordinación

- Backend: contrato, consulta, ranking, Photon, índices y pruebas SQL temporales.
- Datos móvil: estado, consulta, ranking local, manifiestos y selección offline.
- Mapa: viewport inicial y cambios de región válidos, sin trabajo por frame.
- UI: lista bajo el campo, filtros, teclado, Atrás y selección; documentación y QA.

## Trabajo

- [ ] API compatible con consultas anteriores, publicación y límites validados.
- [ ] Estado/consultas unificados y búsqueda local de paquetes descargados.
- [ ] Capturar zona real del mapa y exponer selector de alcance.
- [ ] Mostrar resultados al escribir sin hoja inferior automática.
- [ ] Pruebas de búsqueda, SQL real, tipos/lint y verificación de flujo.
- [ ] Sincronizar producto, arquitectura y comandos de migración.

## Fuentes

- `docs/product/features/mobile-discovery/` y `offline-maps/`.
- `docs/architecture/mobile.md`, `maps-navigation.md` y `database.md`.
- [Photon](https://github.com/komoot/photon/blob/master/docs/api-v1.md).
- [pg_trgm](https://www.postgresql.org/docs/current/pgtrgm.html).
- [React Native 0.86](https://reactnative.dev/docs/0.86/textinput).
- [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation).
- [MapLibre v11](https://maplibre.org/maplibre-react-native/docs/setup/migrations/v11/).
