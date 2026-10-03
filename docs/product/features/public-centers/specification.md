# Feature: consulta pública de centros turísticos

## Resultado

Una persona visitante puede buscar y ver atractivos publicados en el mapa y abrir una ficha
arrastrable. La ficha muestra un resumen al abrirse y el detalle público completo al
expandirse, sin exponer fichas técnicas en borrador ni requerir una cuenta.

## Actores y permisos

- Visitante, con o sin cuenta: puede consultar solo centros activos con estado `PUBLICADO`.
- Administrador: no recibe datos adicionales mediante estos endpoints
  públicos; sus flujos autenticados se implementarán por separado.

## Flujo principal

1. Los clientes piden la lista pública a `GET /api/v1/centers`; Explorar envía el bbox
   visible y recorre las páginas mediante `offset`, `limit` y `meta.total`.
2. La API filtra por estado de publicación y actividad.
3. La aplicación móvil muestra los resultados como marcadores MapLibre.
4. La persona selecciona un marcador; el mapa centra el atractivo y aplica un zoom de
   detalle predeterminado. El pin seleccionado conserva su icono, color y tamaño, y
   tiene prioridad de colocación junto con su nombre.
5. La ficha se abre enseguida, mientras la cámara enfoca el punto; la aplicación solicita
   el detalle mediante el código público del atractivo.
6. La API devuelve el detalle público o un 404 no revelador; la ficha se presenta en un
   bottom sheet con resumen y estado expandido.
7. Una consulta enviada desde el buscador filtra los centros publicados por nombre,
   descripción y clasificación, sin consultar lugares externos.

## Estados y excepciones

- Sin conexión/error del proveedor: la web informa que no pudo cargar contenido; no
  muestra contenido privado ni datos desactualizados como actuales.
- Vacío: se indica que aún no existen atractivos publicados.
- Viewport inválido: la API responde `400` con un mensaje uniforme.
- Paginación inválida: `offset` debe ser un entero no negativo (por defecto 0) y `limit`
  un entero entre 1 y 100 (por defecto 50). Cada respuesta incluye el total filtrado,
  el límite y el desplazamiento aplicado; el orden es estable por relevancia, nombre y código.
- No existe/no publicado: se responde `404` sin distinguir ambos casos.

## Datos

- Lecturas: `centros_turisticos`, estado, clasificación, jerarquía y relaciones públicas
  de ubicación, ingreso, actividades, accesibilidad y facilidades.
- Escrituras: ninguna.
- Ubicación: se filtra por viewport enviado por el cliente; no se solicita ni persiste la
  ubicación del dispositivo.
- Retención/auditoría: no aplica a la consulta anónima inicial.

## Integraciones

- PostgreSQL/PostGIS: consulta espacial parametrizada con geometría de viewport.
- Web pública: lectura por API; nunca conecta directamente a PostgreSQL.

## Fuera de alcance

- Rutas, GPS, imágenes, favoritos y opiniones.
- Captura, aprobación y publicación de nuevas fichas.
