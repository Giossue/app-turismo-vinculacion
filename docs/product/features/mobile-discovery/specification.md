# Feature: descubrimiento móvil público

## Resultado

Una persona turista puede abrir la aplicación móvil, conocer que explora atractivos
publicados y buscar centros turísticos, servicios y referencias geográficas sin iniciar
sesión. Las opciones aparecen mientras escribe, debajo del campo de búsqueda, sin abrir
una hoja inferior de resultados. Explorar y buscar no solicitan permiso de ubicación.

## Actores y permisos

- Visitante: consulta centros y establecimientos publicados, además de referencias
  geográficas de Ecuador.
- La ubicación se solicita solo al tocar «mi ubicación» o activar una función de ruta
  que la necesita. Buscar servicios, cambiar filtros o elegir la zona del mapa no pide GPS.
  Explorar continúa disponible aunque se deniegue el permiso. La sesión foreground
  autorizada se conserva entre pantallas mientras la app está abierta.
- Los mapas ya descargados aportan únicamente los datos públicos guardados en el
  dispositivo; descargar o actualizar un paquete pertenece a la feature de mapas sin conexión.

## Flujo principal

1. Cuando el mapa informa su área inicial o termina un movimiento, la aplicación pide
   `GET /api/v1/centers` con el bbox real y completa las páginas de hasta 100 elementos
   mediante `offset` y `meta.total`. No carga una lista nacional arbitraria de 50
   atractivos. Las solicitudes obsoletas se cancelan y se conserva la respuesta anterior
   mientras llega la nueva. Los catastros se muestran mediante teselas vectoriales.
2. «Buscar aquí» ofrece un solo campo y los filtros «Todo», «Atractivos», «Servicios» y
   «Lugares». Permite buscar nombres o actividades como «cafeterías» y «hoteles».
   «Lugares» incluye referencias geográficas remotas y POIs/recorridos publicados de
   las ciudades descargadas; no mezcla centros o catastros en ese filtro.
3. A partir de dos caracteres, la lista se actualiza en la misma interfaz de búsqueda.
   Las consultas remotas esperan 300 ms desde el último cambio; los datos descargados se
   consultan localmente. No hace falta enviar desde el teclado ni se abre una hoja inferior
   al enviar. Vacío, carga, fallo y cobertura descargada se comunican junto a la lista.
   Mientras la búsqueda está abierta, se oculta la barra «Explorar / Guardados / Menú»
   y la lista usa ese espacio. La barra vuelve al cerrar o seleccionar un resultado;
   ocultar únicamente el teclado mantiene la búsqueda y la barra oculta.
4. El alcance inicial es «Todo Ecuador». «En esta zona» limita la consulta al rectángulo
   geográfico realmente visible en el mapa al terminar el movimiento de la cámara. Sin
   un viewport válido, esa consulta espera; no se amplía silenciosamente a todo el país.
5. Las coincidencias de nombre exacto tienen prioridad, seguidas por las de prefijo,
   contenido y otros campos públicos. La búsqueda normaliza tildes y mayúsculas, admite
   pequeños errores y grupos definidos de palabras equivalentes, como café/cafetería y
   hotel/alojamiento. Entre resultados de relevancia equivalente se utiliza la distancia
   directa a una posición ya disponible o al centro del mapa. Esa distancia se usa solo
   para ordenar: la lista no muestra metros, minutos ni afirmaciones de «cerca de ti».
6. Elegir un centro o establecimiento abre su ficha y centra el mapa. Elegir una referencia
   geográfica centra esa ubicación. Una coincidencia descargada abre el visor local de
   su ciudad y el elemento correspondiente, sin pedir su ficha a la API.
7. Al tocar «mi ubicación», la aplicación valida permiso y GPS, centra la cámara y muestra un
   punto azul únicamente después de recibir una lectura fresca con precisión de 100 m o
   menos; el watcher foreground actualiza la posición mientras la app está activa y se
   reanuda al volver a ella. El botón “mi ubicación” permite reintentar o recentrar
   manualmente. Una posición antigua o una muestra imprecisa no se dibuja como actual.

## Acceso a Perfil

La cabecera de «Menú» conserva nombre, correo e iniciales; tocar ese mismo bloque cierra
la hoja y abre Perfil. «Cerrar sesión» está en Perfil junto al nombre y correo, fuera
del menú. Si la persona explora como invitada, tocar la cabecera abre la entrada de
autenticación y vuelve a Perfil al iniciar sesión. Una sesión restaurada permite
consultar sus datos sin conexión.

## Estados y excepciones

- Carga: indicador semántico de progreso.
- Vacío: mensaje sin datos inventados.
- Error/sin red: se conservan las coincidencias de mapas descargados, se informa la
  cobertura disponible y se permite reintentar la fuente remota. Sin descargas no se
  inventan resultados ni cobertura.
- Ubicación denegada, GPS apagado o señal degradada: se comunica el estado, se retira el
  punto azul si estaba visible y explorar sigue disponible. Mientras la señal se ajusta,
  no se utiliza una posición antigua como sustituto.
- Búsqueda: con menos de dos caracteres no se consulta la API. Los cambios de texto,
  tipo y alcance producen una lista coherente con la consulta actual; una respuesta
  anterior no reemplaza sus resultados. La lista puede estar vacía sin bloquear el mapa.
- «En esta zona» no cambia de ciudad automáticamente cuando no hay coincidencias.
- Sin GPS no se pide permiso como efecto de escribir. Sigue siendo posible ordenar por
  relevancia y usar el centro del mapa para desempatar internamente por distancia;
  no se presenta el centro del mapa como la ubicación de la persona.
- Sin conexión, «Todo Ecuador» solo consulta los paquetes presentes en el dispositivo;
  la interfaz informa las ciudades cubiertas y, al buscar en área, limita esa cobertura
  por intersección con el bbox. No promete cobertura nacional ni mapas
  por provincia. Los paquetes pueden incluir centros, catastros, POIs y recorridos
  publicados; no proporcionan geocodificación general de calles sin conexión.

## Datos e integraciones

- Solo lectura de datos publicados de la API institucional.
- `GET /api/v1/search` combina centros, catastros y referencias geográficas. El filtro
  de tipo y el bbox completo son opcionales y se validan en la API; Photon se consulta
  únicamente desde el backend.
- Una respuesta remota vacía produce un mapa sin pines; no se generan atractivos de ejemplo
  ni se usan centros offline como sustituto de la capa de centros de Explorar. La lista de
  búsqueda puede mostrar coincidencias descargadas identificadas como tales.
- Las consultas de búsqueda y de pines que contienen ubicación o viewport viven solo en memoria;
  no se persisten sus claves ni coordenadas. Las búsquedas recientes locales guardan
  únicamente texto y se pueden borrar. No se guarda un historial de posiciones.
- La URL del backend se inyecta por variable pública `EXPO_PUBLIC_API_URL`, sin secretos.

## Aparición de pines y nombres

- A escalas amplias, los atractivos cercanos se agrupan en el motor nativo. Tocar una
  agrupación acerca la cámara hasta separar sus lugares.
- Los iconos individuales de atractivos aparecen desde zoom 12; sus nombres desde 13.
  Las jerarquías institucionales III/IV permiten mostrar el nombre desde 12. El catastro
  mantiene sus puntos agregados antes de 13, muestra iconos desde 14 y nombres desde 15.
- La colocación nativa reserva espacio y omite pines o nombres que no caben sin taparse.
  La jerarquía real de los atractivos y el centro de la vista determinan su prioridad;
  no se inventa popularidad. Las etiquetas pueden cambiar de lado según el espacio.
- Un nombre que no cabe no obliga a ocultar el icono. Los nombres usan la fuente publicada
  del mapa, tamaño adaptado y halo de contraste en temas claro y oscuro. Sin glifos
  disponibles, se conservan los pines y la interacción sin texto.
- Cada nombre usa el color de su pin: los atractivos usan verde `#166534` en tema claro
  y `#22c55e` en oscuro. Los servicios y puntos de interés usan el color local del icono
  que se dibuja, incluido el icono de respaldo cuando la clave no se reconoce. La regla
  se aplica también al lugar seleccionado y al visor de ciudad descargada.
- El lugar seleccionado conserva su pin y nombre visibles, también si se eligió desde
  una búsqueda fuera del conjunto cargado. Conserva su imagen, color y tamaño habituales.
- El visor de ciudad descargada usa los nombres de su manifiesto y las mismas reglas de
  colocación; sus datos no sustituyen los pines remotos de Explorar.

## Fuera de alcance

- Cálculo de rutas y minutos, navegación giro a giro, descarga/actualización de mapas y
  autenticación; se definen en sus features correspondientes.
