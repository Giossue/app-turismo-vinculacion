# Feature: consulta pública de centros turísticos

## Resultado

Una persona visitante puede ver una lista y ficha simplificada de atractivos que ya han
sido publicados. Esto permite demostrar el primer tramo del producto sin exponer fichas
técnicas en borrador ni requerir una cuenta.

## Actores y permisos

- Visitante, con o sin cuenta: puede consultar solo centros activos con estado `PUBLICADO`.
- Guía, revisor y administrador: no reciben datos adicionales mediante estos endpoints
  públicos; sus flujos autenticados se implementarán por separado.

## Flujo principal

1. La web pide la lista pública a `GET /api/v1/centers`.
2. La API filtra por estado de publicación y actividad.
3. La persona abre una ficha usando el código público del atractivo.
4. La API devuelve el detalle simplificado o un 404 no revelador.

## Estados y excepciones

- Sin conexión/error del proveedor: la web informa que no pudo cargar contenido; no
  muestra contenido privado ni datos desactualizados como actuales.
- Vacío: se indica que aún no existen atractivos publicados.
- Viewport inválido: la API responde `400` con un mensaje uniforme.
- No existe/no publicado: se responde `404` sin distinguir ambos casos.

## Datos

- Lecturas: `centros_turisticos`, estado, clasificación y jerarquía.
- Escrituras: ninguna.
- Ubicación: se filtra por viewport enviado por el cliente; no se solicita ni persiste la
  ubicación del dispositivo.
- Retención/auditoría: no aplica a la consulta anónima inicial.

## Integraciones

- PostgreSQL/PostGIS: consulta espacial parametrizada con geometría de viewport.
- Web pública: lectura por API; nunca conecta directamente a PostgreSQL.

## Fuera de alcance

- Marcadores MapLibre, rutas, GPS, filtros completos, imágenes, favoritos y opiniones.
- Captura, aprobación y publicación de nuevas fichas.
