# Plan: navegación persistente y paquetes offline

Fecha: 2026-09-17  
Estado: fase móvil y contratos públicos implementados; publicación institucional de paquetes
queda pendiente de importar límites oficiales y conectar el flujo administrativo autenticado.

## Decisiones aprobadas

- El mapa es la única pestaña visible de Expo Router; el Agente se abre como sheet nativa y
  el planificador de itinerarios queda pendiente de un modelo persistente.
- El mapa permanece montado mientras se abre y cierra el sheet del agente.
- La caché pública dura 24 horas; centros publicados se consideran frescos durante 10 minutos.
- Los mapas offline se descargan por ciudad, empezando por Guaranda y sin limitar el modelo a
  una sola ciudad.
- El paquete incluye tiles, catálogo de fichas y rutas institucionales registradas.
- La geometría oficial de la ciudad no se edita; las rutas sí tienen versiones administrativas.
- La ruta se obtiene desde ArcGIS en la captura, puede revisarse/editarse en administración y
  solo la versión PUBLICADA se expone al móvil.

## Entregado en esta unidad

1. Shell principal de mapa en Expo Router sin barra inferior y drawer único, conservando el
   drawer local en pantallas secundarias.
2. Persistencia TanStack Query + AsyncStorage y TTL explícito para catálogo/centros.
3. Caché de estilos ArcGIS en memoria, deduplicación de solicitudes y eventos de carga MapLibre.
4. Migración PostgreSQL/PostGIS para límites oficiales, versiones de rutas y paquetes de ciudad.
5. API pública:
   - `GET /api/v1/offline/cities`
   - `GET /api/v1/offline/cities/:slug/manifest`
6. Pantalla `Mapas sin conexión`, Expo SQLite para manifiestos y `OfflineManager` para tiles.

## Pendiente institucional

- Importar el polígono INEC/MGN validado para cada ciudad y publicar la primera versión de
  `paquetes_offline_ciudad`.
- Completar en la web administrativa autenticada el alta de cooperativa/ruta, solicitar una
  ruta a ArcGIS, editar la línea, revisar y publicar una versión.
- Añadir generación/almacenamiento de archivos multimedia y checksum de paquete cuando se
  habilite MinIO/S3.

## Verificación

- Migración aplicada en PostgreSQL local `turismo_vinculacion_app`.
- API devuelve el catálogo de ciudades y rechaza manifiestos sin paquete PUBLICADO.
- `@turismo/mobile`: lint, typecheck y 7 pruebas Vitest pasan.
- `@turismo/api`: lint y typecheck pasan.
