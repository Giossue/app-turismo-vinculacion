# Feature: descubrimiento público completo

## Resultado

Visitantes pueden abrir la aplicación directamente en un mapa a pantalla completa,
buscar atractivos turísticos publicados, filtrar por clasificación, territorio y
jerarquía, seleccionar un marcador y abrir una ficha práctica sin cuenta ni GPS. También
pueden buscar servicios del catastro por actividad; una posición ya disponible puede
ordenar por cercanía sin solicitar permiso al escribir.

## Actores y permisos

- Visitante: solo lee centros `activo` y `PUBLICADO`.
- No se solicitan permisos para explorar atractivos.
- La búsqueda no solicita ubicación foreground. Una posición ya autorizada o el centro
  del mapa puede desempatar por distancia; no se almacenan coordenadas históricas ni se
  usan para analítica.

## Interacción móvil principal

- El mapa es el lienzo principal; búsqueda, categorías y filtros se superponen sin
  convertir la pantalla de inicio en una lista vertical.
- Al seleccionar un marcador se muestra una hoja inferior con datos breves,
  clasificación y acceso a la ficha pública completa.
- Un campo combina atractivos, servicios del catastro y referencias geográficas. Desde
  dos caracteres muestra una lista en vivo debajo del campo, con debounce remoto de 300 ms
  y los filtros «Todo», «Atractivos», «Servicios» y «Lugares». No abre una hoja de resultados.
- «Todo Ecuador» es el alcance inicial. «En esta zona» limita al viewport real del mapa
  y no amplía a otra ciudad si no hay coincidencias. La relevancia tiene prioridad sobre
  la distancia directa; no se confunde esta distancia con minutos o una ruta vial.
- La búsqueda admite tildes, pequeños errores y grupos definidos de sinónimos. Cuando
  hay paquetes descargados, sus coincidencias se identifican y abren en el visor local;
  sin conexión se informa únicamente la cobertura guardada en el dispositivo.
- Si no hay selección, la hoja explica cómo explorar y no ocupa innecesariamente el
  mapa.
- La acción de rutas abre la feature de cálculo y navegación; la búsqueda no simula
  instrucciones ni tiempos de viaje.

## Datos públicos

La ficha muestra clasificación, ubicación referencial, ingreso, actividades,
accesibilidad y facilidades solo cuando estén confirmadas. Los servicios cercanos muestran
solo nombre comercial, actividad, clasificación, categoría, dirección, teléfono publicado,
localidad y distancia. Se excluyen responsables, auditoría, seguridad técnica, rutas
internas, proveedores, datos fiscales e IDs internos.

## Fuera de alcance

- Fotos, favoritos, cuentas, rutas giro a giro y offline de mapas.
- Gestión administrativa, importación y edición del catastro desde la app pública.
