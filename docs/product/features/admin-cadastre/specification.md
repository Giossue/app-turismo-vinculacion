# Catastro administrativo por localidad

## Propósito

Permitir que un agente turístico capture establecimientos turísticos individuales y que un
administrador los revise antes de publicarlos,
(alojamiento, alimentación, agencias, operadoras y otras actividades) sin confundirlos con
la ficha técnica de un centro turístico.

## Alcance implementado

- Listado administrativo paginado mediante la API, con búsqueda por texto, filtros
  territoriales en cascada (provincia, cantón y localidad) y estado activo.
- Alta, edición y activación/desactivación lógica utilizando los datos de
  `establecimientos_turisticos` y la taxonomía jerárquica del catastro.
- Flujo de captura `BORRADOR` → `EN_REVISION` → `PUBLICADO` o `RECHAZADO`. Los agentes
  solo pueden consultar y editar sus propios registros en borrador/rechazados; la decisión
  administrativa conserva la observación, el solicitante y las fechas de revisión.
- La cola administrativa permite abrir el detalle completo enviado —identificación,
  taxonomía, territorio, contacto y coordenadas— antes de aprobar o rechazar.
- Auditoría inmutable de altas, ediciones, activaciones y desactivaciones mediante la
  tabla existente `auditoria_catalogos`, identificada con `ESTABLISHMENT`.
- Catálogo activo de `localidades` para seleccionar la ciudad o poblado de referencia.
- Catálogos dependientes de actividad, clasificación y categoría; las categorías de
  atractivos turísticos no se mezclan con las categorías del catastro.
- La categoría conserva el sistema semántico de la fuente (`ESTRELLAS`, `TENEDORES`,
  `TAZAS`, `COPAS`, `CLASE`, `MODALIDAD` u otro) y, cuando corresponde, su valor numérico.
  Los valores ambiguos quedan marcados para revisión operativa.
- El icono pertenece a la clasificación/tipo de establecimiento, no a cada categoría. El
  color se deriva automáticamente del icono mediante una paleta fija de bajo ruido visual;
  el panel permite elegir únicamente el pin. La etiqueta pública contextual se presenta
  como `clasificación · categoría`.
- Consulta pública por actividad y localidad/posición, con orden por distancia cuando existe
  ubicación.
- Fallback por actividad a la localidad activa más cercana con resultados; la respuesta
  informa localidad solicitada, localidad efectiva y si el fallback fue aplicado.
- La respuesta pública no expone `id`, RUC, razón social ni número de registro.

## Reglas

1. Un establecimiento pertenece a una `localidad`; no se convierte en centro turístico ni
   se copia dentro de la ficha.
2. `localidad_id`, latitud y longitud son obligatorios al crear. Ambas coordenadas deben
   enviarse juntas y se validan dentro de los rangos geográficos. Los registros históricos
   completados con la coordenada de su localidad se identifican como aproximados hasta que
   operación capture la ubicación exacta.
3. El número de registro es único cuando se informa y el RUC, si se informa, debe contener
   13 dígitos.
4. Desactivar es lógico: el registro se conserva para operación e historia.
5. El fallback se calcula para la actividad solicitada y prioriza localidades de tipo
   `CIUDAD`. Una localidad con otra actividad no es una alternativa válida.
6. El catastro público solo incluye establecimientos activos y `PUBLICADO`. La disponibilidad no implica
   reserva ni garantiza que el establecimiento esté abierto en tiempo real.

## Contrato REST

```text
GET   /api/v1/admin/establishments
GET   /api/v1/admin/establishments/:id
GET   /api/v1/admin/establishments/:id/audit
POST  /api/v1/admin/establishments
PATCH /api/v1/admin/establishments/:id
POST  /api/v1/admin/establishments/:id/submit-review
PATCH /api/v1/admin/establishments/:id/review
POST  /api/v1/admin/establishments/:id/deactivate
POST  /api/v1/admin/establishments/:id/reactivate
GET   /api/v1/establishments/nearby
GET   /api/v1/establishments/tiles/:z/:x/:y
```

La captura y consulta privada requieren `AGENTE_TURISTICO` o `ADMINISTRADOR`; la solicitud
de revisión también admite ambos roles y la ruta `/review` requiere `ADMINISTRADOR`. La
consulta pública devuelve `items`,
`requestedLocalityName`, `effectiveLocality` y `fallbackApplied`.

## Pendientes explícitos

- La importación Excel/CSV se implementará con el módulo persistente de importaciones.
- La auditoría reutiliza la tabla existente y no añade columnas ni tablas; la migración
  `20260920_establishment_audit.sql` solo amplía sus restricciones para aceptar el
  discriminador `ESTABLISHMENT` y las acciones del catastro.
- Las columnas de texto `actividad`, `clasificacion` y `categoria` se conservan por
  compatibilidad y trazabilidad. Sus relaciones canónicas viven en los catálogos
  `catalogo_catastro_actividades`, `catalogo_catastro_clasificaciones` y
  `catalogo_catastro_categorias`; los aliases permiten resolver variantes del consolidado.
- `catalogo_catastro_categorias.esquema`, `valor_numerico` y `requiere_revision` separan
  la semántica de la categoría de su etiqueta original. `icono` y `color` permanecen en la
  categoría solo durante la transición, mientras la API y el mapa leen el perfil visual de
  `catalogo_catastro_clasificaciones`. El mapa público recibe teselas vectoriales MVT
  (`/establishments/tiles/:z/:x/:y`); por debajo del zoom 13 los puntos se agregan por celda.
