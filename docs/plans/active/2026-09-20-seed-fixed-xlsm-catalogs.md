# Catálogos fijos del XLSM en PostgreSQL

## Objetivo

Cargar en PostgreSQL los catálogos territoriales y de clasificación que el libro
`temp/Centro Cultural Indio Guaranga (2).xlsm` usa para completar la ficha y construir
el código institucional. La interfaz solo consume estos datos mediante
`GET /admin/catalogs`; no se agregan listas paralelas codificadas en la web.

## Fuente y alcance

- Fuente: hojas `DPA` y `Clas_AT`, complementadas por los rangos nombrados de
  `Valores` para conservar el orden de los subtipos.
- DPA: 25 provincias (incluida `ZONAS_EN_ESTUDIO`), 227 cantones y 1.250 parroquias.
- Clasificación: 2 categorías, 15 tipos y 79 subtipos.
- No se llenan `localidades` ni `zonas_turisticas`: son catastro operativo y no tienen
  una fuente completa en el XLSM. Se administran aparte y las zonas deben pertenecer a
  una localidad para soportar el fallback territorial.
- No se modifica el esquema ni el generador de código. El trigger existente sigue
  componiendo el código de 17 caracteres desde los códigos DPA, clasificación,
  jerarquía y secuencial.

## Estrategia de datos

1. Añadir una migración SQL transaccional e idempotente con los valores del libro.
2. Resolver las relaciones por códigos, nunca por IDs exportados: provincia → cantón
   → parroquia y categoría → tipo → subtipo.
3. Reactivar y actualizar los valores presentes en la fuente; marcar `activo = FALSE`
   los valores fijos que ya no estén en la fuente. No borrar filas para conservar
   referencias e historial.
4. Mantener los catálogos DPA/clasificación fuera de la whitelist de edición de la API.
   Solo siguen editables los catálogos técnicos (actividades, accesibilidad y
   facilidades).

## Verificación

- Ejecutar la migración con `ON_ERROR_STOP=1`, límites de bloqueo/tiempo y una sola
  transacción.
- Comprobar en la base remota los conteos 25/227/1.250 y 2/15/79, relaciones sin
  huérfanos, códigos de dos caracteres y ausencia de duplicados.
- Comprobar que `localidades` y `zonas_turisticas` no se hayan creado desde el XLSM.
- Comprobar que `updateCatalog` rechace una clave DPA o de clasificación y que los
  selects administrativos sigan recibiendo dependencias filtradas desde la API.
- Documentar la carga en `database/migrations/README.md` y conservar la suma SHA-256
  del libro para trazabilidad.

## Reversión

La migración no elimina datos. Si la fuente debe corregirse, se genera una nueva
migración con el XLSM validado; los registros desactivados permanecen disponibles para
auditoría y referencias históricas.

## Resultado de esta ejecución

Aplicado en `turismo_vinculacion_app` el 20 de septiembre de 2026 y ejecutado dos veces
para comprobar idempotencia. Quedaron activos 25/227/1.250 registros DPA y 2/15/79
registros de clasificación. El registro legado `02/02/01` (`Guanujo`) quedó inactivo,
sin borrarse. `localidades` y `zonas_turisticas` permanecen vacías y no se cargaron desde
el XLSM.
