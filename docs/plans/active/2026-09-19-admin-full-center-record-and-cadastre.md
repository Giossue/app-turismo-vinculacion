# Refactor administrativo: ficha integral y catastro por localidad

Fecha: 2026-09-19
Estado: en curso; catastro inicial, navegación integral, revisión por diferencias y captura
estructurada implementados; adaptadores normalizados, valoración persistida y publicación
completa pendientes.

## Avance de esta ejecución

- Implementado módulo API `establishments` sin migraciones: CRUD administrativo sobre las
  columnas existentes, validación de coordenadas/RUC/registro y activación lógica.
- Implementada sección `Catastro` en `web-turismo-admin`, con consulta paginada, formulario,
  filtros territoriales en cascada (provincia, cantón y localidad), actividad,
  clasificación, categoría y estado, además de estados accesibles de carga, vacío y error.
- Implementada consulta pública por actividad con orden espacial y fallback a la ciudad más
  cercana que tenga esa actividad; la respuesta omite identificadores internos y datos
  fiscales.
- Añadido `localities` al contrato de catálogos para que el panel seleccione ciudades y
  poblados sin conexión directa a PostgreSQL.
- Añadido contrato de lectura y guardado por sección para el snapshot JSONB del borrador,
  con lista blanca de las 14 claves (códigos compatibles con `seccion_codigo`), control optimista de versión y auditoría de sección;
  los adaptadores normalizados de publicación aún no se activan para contenido no soportado.
- La auditoría durable específica de catastro queda bloqueada deliberadamente: el esquema
  actual solo audita fichas y catálogos técnicos, y el alcance prohíbe modificar la BD en
  esta refactorización.
- Registrada la matriz de trazabilidad de las nueve hojas en
  `docs/product/features/admin-center-capture/xlsm-field-matrix.md`.
- Iniciada la captura web integral: el editor muestra las 14 secciones con progreso,
  navegación accesible y estado de cada apartado; las respuestas, observaciones y filas
  repetibles se guardan por sección en el snapshot JSONB con control de versión.
- Las secciones que todavía usan tablas normalizadas enlazan al formulario núcleo existente;
  la captura adicional no publica datos hasta que se implementen sus adaptadores.
- El endpoint de secciones devuelve el progreso de cada apartado (`SIN_INICIAR`,
  `INCOMPLETA`, `COMPLETA`, `CON_ERRORES` o `NO_APLICA`) y el API valida el contrato de
  respuestas, observaciones, cantidades y filas antes de versionar el borrador.
- La interfaz muestra el código institucional canónico por partes y dejó de permitir editar
  la jerarquía; una alta sin valoración usa provisionalmente el rango `00` de recurso hasta
  que la Fase 2 calcule el resultado A–I.
- La sección 6 ahora captura por separado el estado de conservación del atractivo y del
  entorno, factores naturales/antrópicos y declaratorias con fecha, ámbito y observación;
  el API valida estados, respuestas, longitudes y fechas antes de guardar el snapshot.
- La sección 7 ahora separa registros de servicios básicos, señalética, salud, seguridad,
  comunicación y amenazas, además de radios portátiles y plan de contingencia; el API valida
  ámbitos, respuestas, cantidades, condiciones y años sin introducir tablas nuevas.
- La sección 8 ahora presenta las cuatro preguntas institucionales de políticas y
  regulaciones con respuesta de cuatro estados, año, especificación y observación, y rechaza
  códigos repetidos o fuera del catálogo contractual.
- La sección 10 ahora conserva por separado el plan de promoción, su inclusión institucional,
  paquetes y medios utilizados, validando respuestas, textos y URLs HTTP/HTTPS.
- La sección 11 ahora separa registro de visitantes, temporadas, procedencias, informantes y
  afluencia, con validación de tipos, meses, años y cantidades enteras no negativas.
- La sección 11 conserva meses como lista validada, procedencias nacionales/extranjeras,
  informantes y afluencia entre semana, fin de semana y feriados sin mezclar sus fuentes.
- La sección 12 ahora captura el resumen de administración/operación y personal especializado,
  además de formación, capacitación e idiomas con cantidades y detalle de “otro”.
- La sección 14 ahora captura anexos con visibilidad pública/administrativa/restringida,
  responsables, levantamiento de accesibilidad y validación del GAD con contactos y fechas
  validados; no expone esos datos en la superficie pública.
- El motor tipado de valoración ya conserva máximos A–I, topes de F/H, total máximo de 100 y
  rangos de jerarquía; la regresión del libro reproduce el total cacheado `48,7` y jerarquía
  `02`. `temp/db.md` todavía documenta `56,2/53,2`, por lo que falta aprobar un fixture
  recalculado y resolver esa discrepancia antes de persistir resultados. La base desplegada
  mantiene `criterios_valoracion`, pero no tiene filas en `indicadores_valoracion`, por lo
  que el servidor conserva la jerarquía provisional `00` y no inventa puntajes.
- El panel consulta `GET /admin/centers/:code/valuation` y muestra si la jerarquía/código son
  provisionales; el endpoint solo expone resultados persistidos y no calcula cuando faltan
  indicadores activos.
- La sección 4 ya captura localidad cercana y distancia desde el catálogo administrativo,
  además de vías terrestres (coordenadas, distancia, material y estado), accesos acuáticos
  y aéreos, tipos y operadores de transporte, los criterios detallados de la hoja
  `ficha_Accesibilidad` y señalización de aproximación. El API valida catálogos opcionales,
  coordenadas, respuestas, cantidades y textos sin tocar el esquema; mientras los catálogos
  desplegados estén vacíos se conserva también una descripción manual para no inventar datos.
- La publicación de la sección 4 ya reemplaza, dentro de la misma transacción, localidad,
  vías, accesos acuáticos/aéreos, tipos y detalles de transporte, respuestas detalladas y
  señalización cuando las filas usan catálogos activos. Las filas manuales quedan en el
  borrador y bloquean únicamente la publicación de esa propuesta.
- La sección 5 ya captura planta turística por ámbito con sus tres cantidades, facilidades
  detalladas con coordenadas, administrador, accesibilidad y estado, y servicios
  complementarios. Sus catálogos se consultan por API y aceptan descripción manual mientras
  estén vacíos; el adaptador de publicación ya reemplaza transaccionalmente las relaciones
  catalogadas y conserva las filas manuales en borrador hasta que exista un catálogo válido.
- La sección 3 ya captura tipo de clima, temperaturas y precipitaciones con rangos validados;
  al publicar, el adaptador reemplaza la relación normalizada de clima y permite retirar el
  registro cuando la sección se marca como no aplicable.
- La sección 11 ya reemplaza transaccionalmente registros, temporadas y meses, procedencias,
  informantes y afluencia; los meses se comprueban contra el catálogo existente y la lectura
  pública de la propuesta normalizada vuelve a alimentar la revisión por diferencias.
- La sección 8 ya reemplaza las respuestas de políticas mediante sus preguntas activas de
  catálogo; las respuestas `SIN_INFORMACION` y `NO_APLICA` no se convierten en falsos y el
  despliegue debe tener sembradas las cuatro preguntas antes de publicar.
- La sección 10 ya publica el plan institucional y sus decisiones en la relación normalizada;
  los medios siguen en el snapshot y bloquean la publicación hasta que el formulario capture
  un tipo activo del catálogo de medios.
- La sección 12 ya publica el resumen de administración/operación y personal especializado;
  los registros de educación, capacitación e idiomas quedan en el borrador hasta enlazarse
  con tipos activos de formación.
- La sección 6 ya reemplaza evaluaciones y declaratorias en sus tablas existentes; los estados
  dependen del catálogo activo y los factores de alteración siguen bloqueando publicación
  hasta que el formulario conserve su identificador de factor.
- La sección 7 ya publica radios portátiles y planes de contingencia; los servicios, señalética,
  salud, seguridad, comunicación y amenazas siguen bloqueados hasta que sus filas incluyan
  referencias de catálogo.
- La sección 14 ya publica el levantamiento de accesibilidad y la validación del GAD; anexos
  documentales y responsables quedan en el borrador hasta enlazarse con archivos y tipos de
  responsabilidad institucional.
- Las facilidades del núcleo ya permiten cantidad y observación por opción seleccionada;
  dejan de guardar siempre la cantidad fija `1`.
- La ficha ahora compara, por sección, la versión publicada con la propuesta y muestra
  cambios agregados, modificados o retirados con valores de catálogo legibles, sin exponer
  identificadores técnicos ni permitir mutaciones desde el comparador.

## Objetivo

Refactorizar la operación administrativa para que un `centro turístico` represente la ficha
técnica institucional completa de 14 secciones, con borrador, valoración, revisión y
publicación coherentes, y crear un módulo independiente de catastro para establecimientos
turísticos asociados a ciudades o poblados.

El trabajo reutilizará el modelo relacional desplegado. No se crearán, eliminarán ni
modificarán tablas, columnas, constraints, índices o extensiones de PostgreSQL/PostGIS.

## Fuentes de verdad

- Libro de referencia:
  `temp/Centro Cultural Indio Guaranga (2).xlsm`.
- Modelo completo de datos: `temp/db.md`.
- Dominio: `docs/product/domain-model.md`.
- Especificación actual de captura:
  `docs/product/features/admin-center-capture/specification.md`.
- Arquitectura administrativa: `docs/architecture/web.md` y
  `docs/architecture/backend.md`.
- Seguridad y publicación: `docs/security/principles.md`.
- DPA oficial: Clasificador Geográfico Estadístico del INEC.

El libro tiene nueve hojas relevantes: la ficha principal, valores, clasificación, DPA,
jerarquía, cálculos, resumen de resultados, accesibilidad detallada y validación del GAD.
Todas deben quedar representadas por el contrato administrativo, aunque las hojas ocultas
se conviertan en catálogos o reglas y no en pantallas literales.

## Decisiones de producto confirmadas

1. Un centro turístico es la raíz de toda la ficha técnica; cada apartado pertenece al
   mismo centro y no constituye un centro adicional.
2. El catastro es un módulo administrativo independiente. Sus establecimientos pertenecen
   a una `localidad`, no a una ficha de centro.
3. La sección 5.1 de la ficha conserva los agregados oficiales de planta turística en el
   atractivo y en la localidad cercana. No duplica las filas individuales del catastro.
4. Provincia, cantón y parroquia se seleccionan en cascada, aunque la ficha persista sólo
   `parroquia_id` como relación territorial final.
5. Categoría, tipo y subtipo se seleccionan en cascada, aunque la ficha persista sólo
   `subtipo_atractivo_id` como relación de clasificación final.
6. La jerarquía no se selecciona manualmente. Se calcula a partir de los criterios de
   valoración A–I y participa en el código después del cálculo.
7. El secuencial y el código son generados por el servidor. El cliente únicamente muestra
   una vista previa y el código canónico devuelto por la API.
8. Cuando no existan establecimientos de la actividad solicitada en la localidad actual,
   el descubrimiento ofrecerá los de la ciudad más cercana que sí tenga resultados de esa
   actividad; si el dato territorial solo identifica un poblado, la respuesta conservará esa
   distinción.
9. La localidad oficial de la sección 4.1 y la localidad alternativa encontrada durante
   una búsqueda son conceptos diferentes; una búsqueda nunca modifica la ficha.

## Situación actual que debe corregirse

- El editor web captura únicamente identificación, ubicación, administración, ingreso,
  actividades, accesibilidad resumida, facilidades y multimedia.
- El DTO y el snapshot tipado de la API sólo aceptan ese subconjunto.
- La publicación normaliza únicamente ese subconjunto de tablas.
- La jerarquía es un campo requerido y editable en el panel.
- Los checkboxes binarios confunden `NO`, `SIN INFORMACIÓN`, `NO APLICA` y ausencia de
  captura.
- Las facilidades del núcleo ya no fuerzan cantidad `1`; el detalle de coordenadas,
  administrador, accesibilidad y estado ahora se captura en la sección 5 y se publica cuando
  usa IDs activos del catálogo.
- La hoja de accesibilidad detallada ya se captura y publica en sus tablas normalizadas cuando
  los criterios usan catálogo; las filas manuales siguen requiriendo una opción de catálogo.
- La revisión no compara publicado contra propuesto por sección.
- No existen endpoints ni navegación administrativa para establecimientos del catastro.
- La base desplegada no contiene establecimientos turísticos y su DPA/clasificación mínima
  de demostración no reproduce los valores del libro.

## Alcance funcional

### 1. Editor integral del centro turístico

Convertir el editor en una captura por secciones con navegación de máximo dos niveles,
progreso visible y guardado independiente:

1. Datos generales y clasificación.
2. Ubicación y administración.
3. Características, clima, línea de producto, escenario e ingreso.
4. Accesibilidad y conectividad:
   - localidad cercana;
   - vías terrestre, acuática y aérea;
   - tipos y detalles de transporte;
   - accesibilidad resumida y detallada;
   - señalización de aproximación.
5. Planta turística y complementarios:
   - agregados en el atractivo;
   - agregados en la localidad cercana;
   - facilidades;
   - servicios complementarios.
6. Conservación, factores de alteración y declaratorias.
7. Higiene y seguridad:
   - servicios básicos;
   - señalética;
   - salud;
   - seguridad;
   - comunicación;
   - radios;
   - amenazas y plan de contingencia.
8. Políticas y regulaciones.
9. Actividades compatibles con la categoría.
10. Promoción y comercialización.
11. Visitantes, temporadas, procedencias, informantes y afluencia.
12. Recurso humano, formación e idiomas.
13. Descripción con límite de 500 caracteres.
14. Anexos, responsables, levantamiento de accesibilidad y validación del GAD.

Cada sección debe admitir explícitamente los patrones del libro:

- selección única `(U)`;
- selección múltiple `(M)`;
- respuesta `SÍ`, `NO`, `SIN INFORMACIÓN` y `NO APLICA` cuando corresponda;
- filas repetibles;
- cantidades donde cero sea diferente de dato desconocido;
- observaciones generales por apartado y observaciones por fila;
- anexos con tipo, fuente, autor, descripción y visibilidad controlada.

### 2. Progreso y validación

La API devolverá por sección uno de estos estados:

- `SIN_INICIAR`;
- `INCOMPLETA`;
- `COMPLETA`;
- `CON_ERRORES`;
- `NO_APLICA`.

El envío a revisión exigirá todas las secciones obligatorias completas o justificadas como
no aplicables. Guardar un borrador seguirá permitiendo captura parcial.

Las validaciones cruzadas incluirán como mínimo:

- cantón perteneciente a la provincia seleccionada;
- parroquia perteneciente al cantón seleccionado;
- tipo perteneciente a la categoría;
- subtipo perteneciente al tipo;
- zona turística compatible con la localidad/cantón del centro;
- actividades compatibles con la categoría;
- rangos de coordenadas, cantidades, precios y fechas;
- datos dependientes obligatorios sólo cuando la respuesta principal sea afirmativa;
- unicidad de opciones y filas que el modelo declara únicas.

### 3. Código institucional

Mostrar un bloque de código con sus partes:

```text
PP CC QQ CA TI ST JE NNN
```

- `PP`, `CC`, `QQ`: provincia, cantón y parroquia seleccionados.
- `CA`, `TI`, `ST`: categoría, tipo y subtipo seleccionados.
- `JE`: jerarquía calculada.
- `NNN`: secuencial generado por el servidor y no reutilizable.

Para el libro de referencia, la regresión esperada es:

```text
02 01 01 MC 01 02 02 001
= 020101MC010202001
```

Mientras la valoración de un borrador sea incompleta, el servidor podrá mantener la
jerarquía `00` de recurso para disponer de un código administrativo provisional. Después de
cada guardado o publicación, el cliente debe adoptar el código canónico devuelto por la API
y dejar de usar el anterior.

La interfaz nunca permitirá editar directamente la jerarquía, el secuencial o el código.

### 4. Valoración y jerarquía

Trasladar las reglas de `Jerarquia`, `Calculos` y `RESUMEN DE RESULTADOS` a lógica tipada y
probada del backend:

| Criterio | Descripción | Máximo |
| --- | --- | ---: |
| A | Accesibilidad y conectividad | 18 |
| B | Planta turística y servicios | 18 |
| C | Conservación e integración | 14 |
| D | Higiene y seguridad | 14 |
| E | Políticas y regulaciones | 10 |
| F | Actividades | 9 |
| G | Difusión y promoción | 7 |
| H | Visitantes y afluencia | 5 |
| I | Recurso humano | 5 |

El cálculo debe:

- conservar el detalle por indicador;
- aplicar el máximo de cada criterio y el máximo total de 100;
- persistir `resultados_indicador` y `resultados_criterio`;
- dejar que los triggers existentes actualicen `puntaje_total`, `jerarquia_id` y código;
- ser reproducible y auditable;
- resolver antes de implementar la discrepancia entre el total almacenado `48,7` del XLSM
  actual y los valores `56,2/53,2` documentados previamente.

### 5. Borrador, revisión y publicación

Mantener `borradores_centros_turisticos` como snapshot JSONB versionado y
`revisiones_publicacion` como copia inmutable de la propuesta enviada.

El contrato de borrador tendrá `schemaVersion` y un objeto por sección. El guardado de una
sección reemplazará esa sección completa dentro del snapshot para distinguir con claridad:

- campo ausente porque no se envió;
- valor vacío que debe limpiar un dato anterior;
- lista vacía que debe retirar relaciones anteriores;
- `false`, cero y `null` como valores con significado propio.

La publicación deberá ejecutarse en una transacción única que:

1. bloquee el centro y valide la versión del borrador;
2. valide todas las secciones y referencias;
3. recalcule indicadores, criterios, total y jerarquía;
4. reemplace o actualice todas las relaciones normalizadas de las secciones 1–14;
5. publique únicamente los anexos aprobados;
6. actualice el estado y el código canónico;
7. genere auditoría y outbox si corresponde;
8. conserve visible la versión pública anterior si la operación falla.

La revisión mostrará diferencias por sección y distinguirá:

- agregado;
- modificado;
- retirado;
- sin cambio.

No se aprobará ni publicará directamente desde una lista sin poder inspeccionar la propuesta
completa.

### 6. Módulo administrativo de Catastro

Agregar `Catastro` como destino principal del panel, separado de `Centros turísticos` y
`Catálogos`.

Primer corte:

- listado de establecimientos;
- filtros por provincia, cantón, localidad, actividad, clasificación, categoría y estado;
- alta y edición;
- activación/desactivación reversible;
- ubicación opcional en mapa;
- auditoría de mutaciones;
- estados de carga, vacío y error accesibles.

El formulario utilizará únicamente columnas existentes de `establecimientos_turisticos`:

- localidad;
- número de registro;
- RUC;
- nombre comercial;
- razón social;
- actividad;
- clasificación;
- categoría;
- dirección;
- teléfono;
- latitud y longitud;
- estado activo.

Como `actividad`, `clasificacion` y `categoria` son texto en el esquema actual, la API deberá
validar valores canónicos y normalizar mayúsculas, espacios y variantes durante alta e
importación. No se agregará una FK como parte de este trabajo.

La importación masiva Excel/CSV se implementará después del CRUD, usando el flujo persistente
de importaciones previsto por la arquitectura. No se bloqueará el CRUD inicial por esa fase.

### 7. Relación entre ficha y catastro

La ficha y el catastro se conectarán sin duplicar establecimientos:

- `centro_localidad_cercana` identifica la localidad oficial de referencia de la sección
  4.1;
- `planta_turistica_centro` conserva el resumen oficial de la sección 5.1;
- `establecimientos_turisticos` conserva los registros individuales del catastro;
- el panel puede sugerir el número de establecimientos a partir del catastro, pero no
  sustituirá automáticamente un agregado oficial ya revisado;
- habitaciones, mesas y plazas permanecerán como agregados manuales porque el catastro
  individual actual no contiene esas capacidades;
- la interfaz mostrará el origen y fecha de verificación disponible para evitar presentar
  una cifra histórica como dato en tiempo real.

### 8. Descubrimiento y fallback territorial

Crear una consulta pública controlada para establecimientos activos por actividad y posición.

Algoritmo:

1. Determinar el origen:
   - ubicación puntual autorizada del turista; o
   - coordenadas del centro abierto cuando no exista permiso/posición.
2. Buscar establecimientos activos de la actividad solicitada en la localidad actual.
3. Si existen, ordenarlos por distancia cuando tengan ubicación.
4. Si no existen, obtener ciudades activas que tengan al menos un establecimiento de esa
   actividad.
5. Ordenar esas localidades con `ST_Distance` y escoger la más cercana.
6. Devolver los establecimientos de esa localidad y metadata de fallback.

La respuesta deberá indicar:

- localidad solicitada;
- localidad efectiva;
- si se aplicó fallback;
- distancia aproximada a la localidad efectiva;
- ausencia de coordenadas cuando sólo sea posible ordenar a nivel de ciudad.

La aplicación móvil mostrará un mensaje equivalente a:

> No encontramos restaurantes en San Simón. Mostramos opciones en Guaranda, la ciudad con
> resultados más cercana.

El fallback se evalúa por actividad. Una localidad con alojamiento no es candidata para una
búsqueda de alimentación si no tiene establecimientos de alimentación.

## Contratos API previstos

Los nombres finales se validarán contra OpenAPI antes de implementar, pero el plan parte de
estas responsabilidades:

```text
GET    /api/v1/admin/centers/:code
GET    /api/v1/admin/centers/:code/sections
PATCH  /api/v1/admin/centers/:code/sections/:sectionCode
POST   /api/v1/admin/centers/:code/recalculate
POST   /api/v1/admin/centers/:code/submit-review
PATCH  /api/v1/admin/centers/:code/review
POST   /api/v1/admin/centers/:code/publish

GET    /api/v1/admin/establishments
POST   /api/v1/admin/establishments
GET    /api/v1/admin/establishments/:id
PATCH  /api/v1/admin/establishments/:id
POST   /api/v1/admin/establishments/:id/deactivate
POST   /api/v1/admin/establishments/:id/reactivate

GET    /api/v1/establishments/nearby
```

Los identificadores internos de establecimientos no se mostrarán como información de negocio
en la interfaz. La autorización seguirá aplicándose en la API y todas las mutaciones
administrativas exigirán `ADMINISTRADOR`.

## Privacidad y publicación

Clasificar los campos de la ficha antes de exponerlos:

- públicos: nombre, descripción aprobada, horarios, accesibilidad confirmada, servicios,
  actividades y medios institucionales autorizados;
- administrativos: observaciones de levantamiento, resultados detallados, contactos de
  responsables e informantes;
- restringidos: firmas, teléfonos/correos personales y documentos internos.

La API pública, el móvil y las herramientas de IA no recibirán datos administrativos o
restringidos. Las firmas y documentos no compartirán el flujo de URL pública de fotografías.

## Preparación de catálogos y datos

No habrá migración de esquema, pero antes de confiar en el código generado se requiere una
corrección idempotente de datos de catálogo:

1. comparar `provincias`, `cantones` y `parroquias` con el DPA oficial;
2. corregir Guaranda como cantón `01` de Bolívar y cargar Ángel Polibio Cháves como parroquia
   `01`;
3. importar el resto de la DPA necesaria sin duplicados;
4. alinear categorías, tipos y subtipos con `Valores` y `Clas_AT`;
5. preservar referencias existentes o reparar los datos demo dentro de una transacción;
6. recalcular códigos afectados después de corregir las relaciones;
7. inventariar los códigos anteriores y verificar que no queden referencias huérfanas.

Esta operación es una corrección de datos versionada, no una modificación del modelo. Se
preparará con inventario, respaldo y rollback explícitos antes de ejecutarla en producción.

## Fases de implementación

### Fase 0 — Contrato funcional y trazabilidad (parcialmente completada)

- Elaborar una matriz `hoja/celda → campo API → tabla/columna` para las nueve hojas.
- Marcar cada campo como obligatorio, condicional, opcional, no aplicable o calculado.
- Definir visibilidad pública, administrativa o restringida.
- Resolver la discrepancia de valoración y aprobar el fixture de referencia.
- Documentar el significado exacto de cada opción de catastro.

La matriz de las nueve hojas y las 14 secciones ya está documentada; la aprobación del
fixture de valoración y la normalización de catálogos siguen pendientes.

Salida: especificación y criterios de aceptación actualizados, sin código de producto.

### Fase 1 — Snapshot completo y endpoints por sección (contrato inicial implementado)

- Definir DTOs y tipos por sección.
- Versionar el snapshot completo.
- Implementar lectura y reemplazo transaccional de una sección.
- Mantener control optimista de versiones.
- Cubrir limpieza explícita de campos y listas.
- Conservar compatibilidad temporal con el editor actual.

La API ya expone lectura y guardado por sección sobre el borrador JSONB, con lista blanca de
14 claves, control de versión, progreso calculado y auditoría. El contrato transitorio de
respuestas, observaciones y filas repetibles ya se valida en el límite HTTP; falta
normalizar el contenido de cada sección antes de publicarlo.

Salida: API capaz de guardar toda la propuesta sin publicarla todavía.

### Fase 2 — Valoración y código

- Implementar reglas A–I y detalle por indicador.
- Eliminar `hierarchyId` de los campos editables.
- Integrar recálculo con el snapshot.
- Generar la vista previa y adoptar el código canónico después de cada mutación relevante.
- Añadir pruebas de regresión con el XLSM.

Salida: jerarquía y código calculados, reproducibles y auditables.

### Fase 3 — Publicación normalizada completa

- Implementar los adaptadores de persistencia de las secciones 1–14.
- Definir reemplazo seguro de relaciones uno-a-uno, uno-a-muchos y muchos-a-muchos.
- Ejecutar valoración, publicación, multimedia y auditoría en una transacción.
- Probar rollback ante fallo intermedio.

Salida: una ficha aprobada se publica completa sin exponer parcialmente la propuesta.

### Fase 4 — Editor web de 14 secciones (iniciada)

- Dividir `center-editor.tsx` en shell, navegación y formularios por sección.
- Implementar selects DPA y clasificación en cascada.
- Implementar triestado, tablas repetibles, observaciones y anexos seguros.
- Mostrar progreso, errores por sección, código y valoración.
- Conservar diseño responsive, navegación accesible y guardado explícito.

El primer corte ya entrega la navegación y el progreso de las 14 secciones, respuestas
de cuatro estados, observaciones y filas repetibles con guardado independiente. Los
campos núcleo existentes se mantienen operativos y cada sección ofrece un enlace directo a
su formulario normalizado. Ya tienen captura específica las secciones 3, 4, 6, 7, 8, 10,
11, 12 y 14; las secciones 4 y 5 ya cuentan con captura estructurada de conectividad,
accesibilidad detallada, planta y complementarios, con adaptadores de publicación catalogada;
aún faltan la valoración persistida y la división física del componente monolítico.

Salida prevista: el administrador puede capturar la ficha completa sin navegar una sola
página monolítica.

### Fase 5 — Revisión por diferencias

- Mostrar publicado frente a propuesto por sección.
- Distinguir agregado, modificado, retirado y sin cambio.
- Mantener la revisión como lectura administrativa antes de aprobar o publicar.

La comparación por secciones ya está disponible en el editor web; la aprobación y la
publicación siguen usando las acciones protegidas existentes. Falta cubrir diferencias de
los adaptadores normalizados cuando se implemente la publicación completa.

Salida: revisión operativa con trazabilidad visual de la propuesta.

### Fase 6 — Catastro administrativo (CRUD y consulta inicial implementados)

- Crear módulo API de establecimientos.
- Añadir navegación y pantallas web de listado, filtros y formulario.
- Implementar activación/desactivación y auditoría.
- Cargar un conjunto representativo por localidad.
- Diseñar después la importación persistente.

El CRUD, filtros territoriales, selección de localidad y activación lógica ya están
disponibles. La auditoría específica e importación quedan pendientes por la restricción de
no alterar el esquema.

Salida: establecimientos administrables por ciudad/localidad sin mezclarse con centros.

### Fase 7 — Consulta pública y fallback (API implementada)

- Implementar búsqueda por actividad y localidad.
- Añadir orden espacial y fallback PostGIS.
- Integrar el contrato en móvil.
- Comunicar localidad efectiva y distancia sin presentar la alternativa como si estuviera en
  el lugar original.

La API ya ordena por distancia, compara actividad sin distinguir mayúsculas/acentos y marca
el fallback. Falta integrar el contrato en la experiencia móvil.

Salida: el turista recibe opciones de la localidad más cercana cuando no hay resultados
locales.

### Fase 8 — Catálogos, documentación y retiro de compatibilidad

- Ejecutar la corrección controlada de DPA y clasificación.
- Actualizar producto, arquitectura, OpenAPI y documentación operativa.
- Retirar el payload parcial anterior después de migrar el panel.
- Mover este plan a `docs/plans/completed/` con resultados reales.

## Archivos y áreas previstos

### Monorepo/API

- `apps/api/src/admin/admin.dto.ts`
- `apps/api/src/admin/admin.controller.ts`
- `apps/api/src/admin/admin-centers.service.ts`
- nuevos tipos/servicios de secciones bajo `apps/api/src/admin/`
- nuevo módulo de establecimientos bajo `apps/api/src/establishments/`
- repositorios públicos de búsqueda espacial
- pruebas de servicio, contrato y workflow bajo `apps/api/test/`
- seeds versionados para DPA y clasificación, sin DDL

### Repositorio administrativo

- `src/components/admin/center-editor.tsx`, reducido a shell
- componentes de sección bajo `src/components/admin/center-sections/`
- módulo de catastro bajo `src/components/admin/establishments/`
- `src/components/admin/admin-shell.tsx`
- `src/lib/admin-api.ts`
- tipos y pruebas del formulario y contratos

### Móvil

- dominio y cliente público de establecimientos
- filtros de servicios cercanos
- presentación del fallback territorial

### Documentación

- especificación y aceptación de captura administrativa
- modelo de dominio y glosario
- arquitectura web/backend/base de datos
- especificación pública de descubrimiento
- privacidad de contactos, firmas y documentos
- OpenAPI y matrices de trazabilidad

## Fuera de alcance

- Cambiar el esquema PostgreSQL/PostGIS.
- Reemplazar PostgreSQL como fuente de verdad.
- Conectar la web directamente a la base.
- Reservas, pagos o disponibilidad comercial en tiempo real.
- Inferir capacidades, accesibilidad o servicios no confirmados.
- Publicar teléfonos, correos o firmas personales.
- Modificar automáticamente la localidad oficial de una ficha por una búsqueda del turista.
- Hacer que la importación masiva bloquee la entrega del CRUD inicial de catastro.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| Formulario demasiado extenso | Navegación por secciones, progreso y guardado independiente. |
| Payload monolítico y conflictos | Reemplazo por sección con versión optimista. |
| Perder diferencias entre no, desconocido y vacío | Tipos explícitos y pruebas de serialización. |
| Código mutable durante el borrador | Adoptar siempre el código canónico devuelto; no reutilizar enlaces anteriores. |
| Cálculo distinto del Excel | Fixture de regresión, detalle por indicador y topes documentados. |
| DPA o clasificación incompatibles | Auditoría y corrección idempotente antes de publicación institucional. |
| Publicación parcial | Una única transacción y pruebas de rollback. |
| Exposición de datos personales | Clasificación de campos y DTO público por allowlist. |
| Fallback incorrecto | Filtrar primero por actividad y recién después ordenar localidades. |
| Distancias engañosas | Identificar distancia aproximada y localidad efectiva. |
| Catastro textual inconsistente | Valores canónicos validados por API e importador. |
| Agregados históricos presentados como actuales | Mostrar origen/fecha de verificación y no sobrescribirlos silenciosamente. |

## Verificación

### API y persistencia

- Pruebas unitarias de cada regla de valoración.
- Regresión del código `020101MC010202001` con la ficha de referencia.
- Pruebas de DTO para triestado, listas vacías, `null`, cero y no aplica.
- Pruebas de guardado concurrente y versión obsoleta.
- Pruebas transaccionales de publicación y rollback.
- Pruebas negativas de rol para todos los endpoints administrativos.
- Pruebas que confirmen que borradores y anexos pendientes no son públicos.
- Pruebas de búsqueda espacial con localidad sin resultados y varias candidatas.
- `EXPLAIN (ANALYZE, BUFFERS)` con volumen representativo para el fallback PostGIS.

### Web administrativa

- Navegación por teclado, foco, labels y mensajes accesibles.
- Persistencia de cada sección después de recargar.
- Cambio correcto de opciones en selects dependientes.
- Comparación publicado/propuesto con altas, cambios y retiros.
- Responsive en escritorio, tablet y teléfono.
- Estados de carga, error, vacío, guardado y conflicto.

### Móvil/público

- Sin ubicación: búsqueda desde el centro o localidad seleccionada.
- Con ubicación: orden espacial sin persistir historial.
- Sin resultados locales: fallback visible y correcto por actividad.
- Sin resultados nacionales: estado vacío honesto, sin inventar opciones.

### Comandos

```bash
corepack pnpm --filter @turismo/api lint
corepack pnpm --filter @turismo/api typecheck
corepack pnpm --filter @turismo/api test
corepack pnpm --filter @turismo/mobile lint
corepack pnpm --filter @turismo/mobile typecheck
corepack pnpm --filter @turismo/mobile test

cd ../web-turismo-admin
bun run verify
```

## Criterios de aceptación globales

- El administrador puede completar y volver a abrir las 14 secciones sin pérdida de datos.
- Todos los campos del XLSM tienen trazabilidad a un campo, catálogo, regla o exclusión
  explícita.
- Provincia/cantón/parroquia y categoría/tipo/subtipo funcionan como selecciones dependientes.
- Jerarquía, secuencial y código no son editables y se calculan correctamente.
- La publicación aplica la ficha completa o no aplica ningún cambio.
- La revisión compara la propuesta completa contra la versión publicada.
- Catastro aparece como módulo separado y administra establecimientos por localidad.
- La sección 5.1 distingue agregados oficiales de registros individuales.
- Si una actividad no existe en la localidad actual, se devuelve la localidad más cercana
  que tenga esa misma actividad.
- Ningún dato personal o documento restringido aparece en contratos públicos.
- No se introduce ninguna migración de esquema.

## Definition of Done

El trabajo termina cuando ficha, snapshot, API, tablas existentes, valoración, código,
revisión, catastro, búsqueda pública, móvil, pruebas y documentación cuentan la misma
historia; las correcciones DPA/clasificación están verificadas contra fuentes oficiales y no
quedan rutas de compatibilidad que puedan publicar una ficha parcial.
