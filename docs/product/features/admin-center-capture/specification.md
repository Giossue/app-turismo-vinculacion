# Captura administrativa del núcleo de fichas

## Propósito

Permitir que un `ADMINISTRADOR` cree y complete el núcleo de una ficha turística sin
alterar el contenido publicado hasta que exista una revisión aprobada y una publicación
explícita.

## Alcance actual

- Identificación, clasificación, territorio, ubicación, dirección y descripción.
- Administración institucional, clima e ingreso/atención.
- Actividades, condiciones de accesibilidad y facilidades seleccionadas desde catálogos
  activos, validadas contra la categoría del atractivo.
- Borrador versionado, envío a revisión, aprobación, rechazo y publicación.
- Desactivación/reactivación y auditoría.
- Multimedia institucional con descripción y fuente/autor. El panel valida fotos JPEG/PNG/WebP,
  video MP4/WebM y audio MP3/M4A/WAV/OGG, aplica límites de tamaño y mantiene los archivos
  pendientes hasta la publicación.
- El editor presenta provincia → cantón → parroquia y categoría → tipo → subtipo en cascada;
  el contrato administrativo ya dispone de catorce claves de sección para ampliar el
  snapshot sin crear centros derivados.
- El editor web presenta las catorce secciones con progreso y navegación accesible. Cada
  apartado admite respuesta `SÍ`, `NO`, `SIN INFORMACIÓN` o `NO APLICA`, observación general
  y filas repetibles con cantidad y observación por fila; el guardado reemplaza únicamente
  la sección elegida dentro del snapshot versionado.
- El código institucional se muestra por componentes y la jerarquía es de solo lectura. Si
  la valoración aún no está calculada, el servidor usa provisionalmente la jerarquía `00`.
- La sección de accesibilidad conserva la localidad cercana y su distancia aproximada,
  separadas de la localidad oficial del centro y validadas contra el contrato de captura.

El snapshot se puede consultar en `GET /admin/centers/:code/sections` y actualizar por
sección con `PATCH /admin/centers/:code/sections/:sectionCode`. Durante la transición, el
contenido aún no normalizado permanece en el borrador JSONB y no se considera publicado hasta
que exista su adaptador transaccional. La lectura devuelve el progreso por sección y el API
rechaza respuestas, cantidades o filas que no cumplan el contrato de captura.

El administrador puede renombrar y activar/desactivar opciones de los catálogos técnicos;
cada cambio queda auditado. El panel acepta fotos, video y audio; documentos, importaciones y
procesamiento avanzado quedan para una fase posterior.

## Reglas

1. Solo `ADMINISTRADOR` puede usar `/admin/*`.
2. El turista solo recibe centros activos con estado `PUBLICADO`.
3. Las ediciones de un centro publicado se almacenan como borrador aislado.
4. Una ficha no puede publicarse sin revisión aprobada.
5. La publicación aplica el snapshot y registra auditoría en una transacción.
6. Una fotografía pendiente no tiene URL pública utilizable; la URL solo se incluye cuando
   la ficha y el archivo están publicados.
