# Feature: descubrimiento público completo

## Resultado

Visitantes pueden abrir la aplicación directamente en un mapa a pantalla completa,
buscar atractivos turísticos publicados, filtrar por clasificación, territorio y
jerarquía, seleccionar un marcador y abrir una ficha práctica sin cuenta ni GPS.

## Actores y permisos

- Visitante: solo lee centros `activo` y `PUBLICADO`.
- No se solicitan permisos ni se almacenan coordenadas del dispositivo.

## Interacción móvil principal

- El mapa es el lienzo principal; búsqueda, categorías y filtros se superponen sin
  convertir la pantalla de inicio en una lista vertical.
- Al seleccionar un marcador se muestra una hoja inferior con datos breves,
  clasificación y acceso a la ficha pública completa.
- Si no hay selección, la hoja explica cómo explorar y no ocupa innecesariamente el
  mapa.
- La acción de rutas se muestra solo cuando puede calcular una ruta real. Hasta que
  se implemente, se identifica como próxima funcionalidad y no simula navegación.

## Datos públicos

La ficha muestra clasificación, ubicación referencial, ingreso, actividades,
accesibilidad y facilidades solo cuando estén confirmadas. Excluye responsables,
auditoría, seguridad técnica, rutas internas, proveedores y IDs internos.

## Fuera de alcance

- Fotos, POIs/catastro, favoritos, cuentas, rutas, ubicación y offline de mapas.
