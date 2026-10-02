# Mapas y rutas sin conexión

## Usuario y flujo

Una persona con sesión turística descarga una ciudad antes de perder internet. Desde
«Mapas sin conexión» puede abrir, actualizar o borrar esa ciudad. El visor local muestra
el mapa, centros turísticos, puntos de interés propios y establecimientos públicos,
además de recorridos de transporte publicados. Su búsqueda y sus fichas leen únicamente
la descarga, sin solicitudes de búsqueda ni de fichas a la API.

Los paquetes guardados siguen disponibles al reiniciar y no caducan con la caché pública
de consultas de 24 horas. Una ciudad descargada permanece en el listado aunque el catálogo
remoto no responda o la ciudad ya no permita nuevas descargas. Sus datos muestran la
fecha de descarga; actualizar requiere internet y datos aún publicados.

## Contenido y cobertura

- Solo se descargan ciudades con metadatos de paquete PUBLICADO.
- El paquete conserva el estilo claro/oscuro y los recursos cartográficos de la zona y
  niveles de zoom definidos. No promete cobertura de Ecuador completo.
- Los centros pertenecen a la ciudad y deben estar activos y publicados. Los catastros
  están publicados y activos; los POIs propios siguen la misma política de visibilidad
  del endpoint público de POIs. No se incluyen datos fiscales ni identificadores internos.
- El límite vigente oficial tiene prioridad. Si todavía no existe, se utiliza una zona
  rectangular de ±0.12 grados alrededor de las coordenadas de la ciudad. Sin límite ni
  coordenadas válidas se rechaza el paquete; nunca se sustituye por otra ciudad.
- Un recorrido institucional puede continuar fuera de la zona descargada. Se conserva la
  línea completa y se informa que fuera de la zona no se garantizan calles descargadas.
- Las fichas contienen información pública incluida en el manifiesto: nombres, descripciones,
  categorías y, en catastros, dirección y teléfono públicos cuando existen. Fotografías,
  opiniones, horarios dinámicos e IA no forman parte de esta descarga.
- Los bytes informados corresponden a recursos de mapa reportados por MapLibre, no al
  espacio total exacto del dispositivo. No se inventa un tamaño si no se conoce.

## Guardar y seguir rutas calculadas

En «Cómo llegar», guardar una ruta es una acción explícita. Se conserva en el dispositivo
su origen, destino, modo, geometría e instrucciones reales. Cada cuenta tiene hasta 20
rutas; una ruta nueva sustituye la más antigua al alcanzar el límite. Pueden borrarse.
Las rutas de cuentas diferentes nunca se muestran juntas.

Abrir una ruta guardada no calcula una ruta ni activa GPS o seguimiento en segundo plano.
La persona pulsa «Iniciar navegación» y se aplican los controles y permisos existentes.
El seguimiento y las instrucciones usan la geometría y una lectura GPS fresca. Desviarse
de una ruta guardada no consulta el servidor: la interfaz indica que hay que volver al
recorrido. El mapa base de las ciudades recorridas se descarga por separado.

Los recorridos institucionales del paquete se pueden visualizar y consultar; no se
transforman en instrucciones giro a giro ni se presentan como una ruta desde la ubicación
actual. Calcular rutas nuevas o recalcular un desvío requiere internet y el proveedor del
backend. Una navegación online conserva la última ruta ante errores de recálculo y permite
reintentar manualmente, evitando solicitudes automáticas repetidas.

## Descargas y errores

Una descarga nueva se guarda por completo antes de borrar la anterior. Fallos de red,
MapLibre o almacenamiento conservan el paquete anterior. No se descarga y borra una misma
ciudad concurrentemente. Borrar libera sus paquetes nativos y elimina el manifiesto local;
si el borrado no puede completarse se conserva información para reintentarlo.

Los paquetes antiguos sin POIs, catastros o estilo local siguen siendo legibles. La app
indica que deben actualizarse para obtener esos recursos; no les atribuye capacidades que
no se descargaron.

## Activación

La API necesita `OFFLINE_MAP_STYLE_URL` con el estilo HTTP/S de nuestro TileServer y sirve
una versión normalizada en `GET /api/v1/offline/map-style`. La publicación institucional
del paquete y el contenido aprobado son requisitos adicionales al despliegue del código.
No se publican paquetes ni centros automáticamente por instalar esta actualización.
