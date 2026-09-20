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
- El contrato `GET /admin/catalogs` expone también los catálogos institucionales de las
  secciones extendidas: conservación, higiene y seguridad, políticas, promoción, formación,
  responsabilidades y meses. Su consulta es de solo lectura y no crea valores cuando el
  despliegue todavía no los ha cargado.
- El código institucional se muestra por componentes y la jerarquía es de solo lectura. Si
  la valoración aún no está calculada, el servidor usa provisionalmente la jerarquía `00`.
- El panel consulta el estado de valoración por ficha; distingue resultados persistidos de la
  jerarquía provisional y no presenta un puntaje cuando faltan indicadores activos.
- La sección de accesibilidad conserva la localidad cercana y su distancia aproximada,
  separadas de la localidad oficial del centro. También captura vías terrestres con sus
  coordenadas, distancia, material y estado; accesos acuáticos y aéreos; tipos y operadores
  de transporte; los criterios detallados de `ficha_Accesibilidad`; y señalización de
  aproximación. Los catálogos se consultan por API y, mientras falten opciones en el
  despliegue, se permite una descripción manual que queda pendiente de normalización. La
  publicación transaccional reemplaza las tablas de la sección cuando las filas usan IDs
  activos; una fila manual bloquea la publicación sin perderse del borrador.
- La sección de características conserva el tipo de clima y sus rangos de temperatura y
  precipitación, distinguiendo valores ausentes de cero. Al publicar, esos valores reemplazan
  la relación normalizada de clima; marcar la sección como `NO APLICA` retira esa relación.
- La sección de planta turística conserva registros de alojamiento, alimentos y bebidas,
  agencias y guías por ámbito, junto con sus tres cantidades; las facilidades conservan
  cantidad, coordenadas, administrador, accesibilidad universal y estado; y los servicios
  complementarios conservan ámbito, tipo y especificación. Los tipos se consultan por API y
  admiten descripción manual durante la transición de catálogos vacíos. Al publicar, la API
  exige IDs activos para reemplazar las relaciones normalizadas; las filas manuales no se
  publican hasta que se incorpore su opción al catálogo.
- La sección de conservación distingue el estado del atractivo y del entorno, factores de
  alteración naturales/antrópicos y declaratorias con fecha, ámbito y observación dentro del
  mismo centro turístico. Los estados y declaratorias se publican en sus relaciones existentes;
  los factores requieren un identificador activo del catálogo.
- La sección de higiene y seguridad separa servicios básicos, señalética, salud, seguridad,
  comunicación y amenazas, y conserva controles de radios y contingencia con sus respuestas,
  cantidades y observaciones. Radios, contingencia y filas con referencias activas de catálogo
  se publican en sus relaciones existentes; los servicios afirmativos crean filas y las
  amenazas conservan también una respuesta negativa explícita.
- La sección de políticas y regulaciones presenta las cuatro preguntas institucionales con
  respuesta explícita, año, especificación y observación, conservando `SIN INFORMACIÓN` y
  `NO APLICA` como estados distintos. Al publicar, las respuestas se vinculan con las
  preguntas activas del catálogo y los estados no binarios mantienen la propuesta en revisión.
- La sección de promoción y comercialización separa el plan institucional, los paquetes y
  los medios de difusión, con nombre, periodicidad, URL y observación validados. El plan se
  publica en su relación normalizada; los medios afirmativos requieren un tipo activo del
  catálogo y se publican en `medios_promocion_centro_turistico`, mientras las respuestas
  negativas no crean relaciones.
- La sección de visitantes y afluencia separa registros, temporadas, procedencias,
  informantes y cantidades habituales, conservando meses, años y cero como datos explícitos.
  Al publicar, reemplaza sus relaciones normalizadas; los meses se validan contra el catálogo
  existente y un registro con estado desconocido no se publica como falso.
- Las temporadas rechazan meses fuera de 1–12 o repetidos, y las procedencias distinguen
  ciudad nacional de país extranjero antes de publicar la ficha.
- La sección de recurso humano conserva cantidades del resumen y registros de educación,
  capacitación e idiomas sin crear un centro separado. El resumen y las filas con tipos
  activos se publican en sus relaciones normalizadas; una fila sin referencia catalogada
  permanece en el borrador.
- La sección de anexos conserva tipo, fuente, autor, descripción y visibilidad controlada,
  junto con responsables, levantamiento de accesibilidad y validación del GAD; contactos,
  firmas y documentos internos permanecen administrativos o restringidos. El levantamiento,
  la validación y responsables con tipo institucional se publican en sus relaciones existentes;
  documentos requieren archivo/tipo institucional antes de publicarse.
- La valoración usa un motor tipado con topes por criterio y jerarquía reproducible; la
  publicación todavía debe conectar cada indicador con sus tablas normalizadas y guardar el
  detalle auditable. Mientras `indicadores_valoracion` no tenga reglas activas, el servidor
  conserva la jerarquía provisional `00` y no calcula puntajes inventados.
- Las facilidades seleccionadas conservan cantidad y observación por opción, en lugar de
  imponer siempre una cantidad fija.
- Durante la revisión, el editor compara la versión publicada con la propuesta por cada
  sección y distingue altas, modificaciones y retiros con valores de catálogo legibles;
  la comparación es de solo lectura.

El snapshot se puede consultar en `GET /admin/centers/:code/sections` y actualizar por
sección con `PATCH /admin/centers/:code/sections/:sectionCode`. Durante la transición, el
contenido aún no normalizado (incluida cualquier fila manual) permanece en el borrador JSONB y
no se considera publicado hasta
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
