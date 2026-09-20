# Feature: descubrimiento público completo

## Resultado

Visitantes pueden abrir la aplicación directamente en un mapa a pantalla completa,
buscar atractivos turísticos publicados, filtrar por clasificación, territorio y
jerarquía, seleccionar un marcador y abrir una ficha práctica sin cuenta ni GPS. También
pueden buscar servicios del catastro por actividad; esa consulta usa ubicación foreground
solo cuando la persona la solicita y comunica cualquier fallback territorial.

## Actores y permisos

- Visitante: solo lee centros `activo` y `PUBLICADO`.
- No se solicitan permisos para explorar atractivos.
- Servicios cercanos puede solicitar ubicación foreground puntual; no se almacenan
  coordenadas históricas ni se usan para analítica.

## Interacción móvil principal

- El mapa es el lienzo principal; búsqueda, categorías y filtros se superponen sin
  convertir la pantalla de inicio en una lista vertical.
- Al seleccionar un marcador se muestra una hoja inferior con datos breves,
  clasificación y acceso a la ficha pública completa.
- `Servicios cercanos` permite escribir una actividad y ver establecimientos activos,
  localidad efectiva, distancia aproximada y fallback cuando la localidad consultada no
  tiene resultados.
- Si no hay selección, la hoja explica cómo explorar y no ocupa innecesariamente el
  mapa.
- La acción de rutas se muestra solo cuando puede calcular una ruta real. Hasta que
  se implemente, se identifica como próxima funcionalidad y no simula navegación.

## Datos públicos

La ficha muestra clasificación, ubicación referencial, ingreso, actividades,
accesibilidad y facilidades solo cuando estén confirmadas. Los servicios cercanos muestran
solo nombre comercial, actividad, clasificación, categoría, dirección, teléfono publicado,
localidad y distancia. Se excluyen responsables, auditoría, seguridad técnica, rutas
internas, proveedores, datos fiscales e IDs internos.

## Fuera de alcance

- Fotos, favoritos, cuentas, rutas giro a giro y offline de mapas.
- Gestión administrativa, importación y edición del catastro desde la app pública.
