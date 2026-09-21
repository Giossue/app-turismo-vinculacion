# Catastro administrativo por localidad

## Propósito

Permitir que un administrador mantenga establecimientos turísticos individuales
(alojamiento, alimentación, agencias, operadoras y otras actividades) sin confundirlos con
la ficha técnica de un centro turístico.

## Alcance implementado

- Listado administrativo paginado mediante la API, con búsqueda por texto, filtros
  territoriales en cascada (provincia, cantón y localidad) y estado activo.
- Alta, edición y activación/desactivación lógica utilizando los datos de
  `establecimientos_turisticos` y la taxonomía jerárquica del catastro.
- Auditoría inmutable de altas, ediciones, activaciones y desactivaciones mediante la
  tabla existente `auditoria_catalogos`, identificada con `ESTABLISHMENT`.
- Catálogo activo de `localidades` para seleccionar la ciudad o poblado de referencia.
- Catálogos dependientes de actividad, clasificación y categoría; las categorías de
  atractivos turísticos no se mezclan con las categorías del catastro.
- Consulta pública por actividad y localidad/posición, con orden por distancia cuando existe
  ubicación.
- Fallback por actividad a la localidad activa más cercana con resultados; la respuesta
  informa localidad solicitada, localidad efectiva y si el fallback fue aplicado.
- La respuesta pública no expone `id`, RUC, razón social ni número de registro.

## Reglas

1. Un establecimiento pertenece a una `localidad`; no se convierte en centro turístico ni
   se copia dentro de la ficha.
2. `localidad_id` es obligatorio al crear. Latitud y longitud son opcionales, pero deben
   enviarse juntas y se validan dentro de los rangos geográficos.
3. El número de registro es único cuando se informa y el RUC, si se informa, debe contener
   13 dígitos.
4. Desactivar es lógico: el registro se conserva para operación e historia.
5. El fallback se calcula para la actividad solicitada y prioriza localidades de tipo
   `CIUDAD`. Una localidad con otra actividad no es una alternativa válida.
6. El catastro público solo incluye establecimientos activos. La disponibilidad no implica
   reserva ni garantiza que el establecimiento esté abierto en tiempo real.

## Contrato REST

```text
GET   /api/v1/admin/establishments
GET   /api/v1/admin/establishments/:id
GET   /api/v1/admin/establishments/:id/audit
POST  /api/v1/admin/establishments
PATCH /api/v1/admin/establishments/:id
POST  /api/v1/admin/establishments/:id/deactivate
POST  /api/v1/admin/establishments/:id/reactivate
GET   /api/v1/establishments/nearby
```

Las rutas administrativas requieren `ADMINISTRADOR`. La consulta pública devuelve `items`,
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
