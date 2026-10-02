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

- Backend: contrato, consulta, ranking, Photon y pruebas SQL temporales.
- Datos móvil: estado, consulta, ranking local, manifiestos y selección offline.
- Mapa: viewport inicial y cambios de región válidos, sin trabajo por frame.
- UI: lista bajo el campo, filtros, teclado, Atrás y selección; documentación y QA.

## Trabajo

- [x] API compatible con consultas anteriores, publicación y límites validados.
- [x] Estado/consultas unificados y búsqueda local de paquetes descargados.
- [x] Capturar zona real del mapa y exponer selector de alcance.
- [x] Mostrar resultados al escribir sin hoja inferior automática.
- [x] Pruebas de búsqueda, SQL real, tipos/lint y verificación de flujo.
- [x] Sincronizar producto y arquitectura; confirmar que no requiere migración.

## Resultado y verificación

- Lista en vivo que permanece abierta al enviar u ocultar el teclado. Filtros por
  tipo y alcance; sin permisos de ubicación implícitos ni navegación adicional.
- Mapas descargados integrados con cobertura identificada y apertura directa del
  elemento en el visor local. No se usan cachés remotas como cobertura sin conexión.
- Relevancia conservada entre API y móvil, incluso desde descripción/dirección;
  cercanía directa desempata y no se muestra como distancia o tiempo de ruta.
- Corregidos regreso desde ficha, avisos de cobertura por zona y recorridos que
  cruzan el área aunque sus extremos queden fuera.
- Móvil: 298 pruebas, TypeScript y lint. API: 365 pruebas de suite general;
  21 pruebas SQL de búsqueda se ejecutaron además en PostgreSQL/PostGIS temporal.
- UI Android: vertical 360×640/1.0, horizontal 640×360/1.5 y 320×568/2.0;
  opciones sobre el teclado, envío y selección pasaron. Capturas revisadas en
  `/tmp/turismo-search-qa*`; alcance y límites en `mobile-responsive-checks.md`.
- SQL usa el esquema y `pg_trgm` existentes. EXPLAIN con 3.000 catastros de prueba
  tomó unos 131 ms y recorrió filas por las condiciones de taxonomías unidas.
  Se retiraron índices opcionales sin beneficio demostrado; no es una medición de
  producción ni certifica rendimiento nacional. Evidencia temporal:
  `/tmp/turismo-public-search-explain.json`.

## Fuentes

- `docs/product/features/mobile-discovery/` y `offline-maps/`.
- `docs/architecture/mobile.md`, `maps-navigation.md` y `database.md`.
- [Photon](https://github.com/komoot/photon/blob/master/docs/api-v1.md).
- [pg_trgm](https://www.postgresql.org/docs/current/pgtrgm.html).
- [React Native 0.86](https://reactnative.dev/docs/0.86/textinput).
- [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation).
- [MapLibre v11](https://maplibre.org/maplibre-react-native/docs/setup/migrations/v11/).
