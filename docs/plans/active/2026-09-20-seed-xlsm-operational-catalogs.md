# Catálogos operativos fijos de la ficha XLSM

## Objetivo

Cargar las opciones normalizadas que el libro institucional usa en las secciones 4 a
12 de la ficha, para que el editor administrativo las consuma desde PostgreSQL en vez
de inventarlas o mantenerlas como listas locales.

## Incluido

- Transporte, criterios detallados de accesibilidad y frecuencia de servicio.
- Planta turística, facilidades y servicios complementarios.
- Conservación y factores de alteración.
- Servicios básicos, señalética, salud, seguridad, comunicaciones y amenazas.
- Preguntas de políticas, medios de promoción, formación del personal y actividades.
- Actualización de nombres de facilidades/frecuencias existentes para reflejar el XLSM.

## No incluido

- `catalogo_clima`: el libro solo contiene el ejemplo `Templado`, no un catálogo nacional
  aprobado.
- `materiales_via`: el libro deja el material como texto libre (`texto`/ejemplo), sin
  lista cerrada.
- Ciudades, poblados y zonas turísticas: son catastro territorial separado.
- Datos del caso de Guaranda (cantidades, nombres de operadores, URLs, instituciones o
  declaraciones): son datos de ejemplo y no se cargan como catálogo.

## Estrategia

La migración es transaccional e idempotente. Reactiva y actualiza las opciones presentes
en el XLSM mediante códigos estables; no elimina opciones técnicas ya administradas para
no romper referencias históricas. Las relaciones se resuelven por código y mantienen las
FK existentes.

## Verificación

Se comprobará la presencia de 14 transportes, 51 criterios de accesibilidad, 20 tipos de
planta, 5 servicios complementarios, 4 estados de conservación, 22 factores de alteración,
23 servicios básicos, 24 tipos de señalética, 3 materiales, 5 servicios de salud, 4 de
seguridad, 8 de comunicación, 8 amenazas, 4 preguntas de política, 56 actividades, 8
medios de promoción y 17 opciones de formación.

## Resultado de la ejecución (2026-09-20)

Se generó `database/migrations/20260920_seed_xlsm_operational_catalogs.sql` con el
generador reproducible indicado arriba y se ejecutó dos veces contra la base remota.
Ambas ejecuciones terminaron con `COMMIT`. La segunda ejecución no duplicó filas: dejó
activos los códigos fuente con los conteos esperados y conservó las tres actividades
técnicas preexistentes que no forman parte del XLSM. Los aliases duplicados de una carga
previa de facilidades quedaron inactivos, sin borrar sus filas ni sus identificadores.
`localidades` y `zonas_turisticas`
continuaron vacías, como corresponde al módulo de catastro separado.

Conteos activos verificados por código fuente: transportes 14, criterios 51, planta 20,
facilidades 5/16 (categorías/tipos), complementarios 5, conservación 4, factores 22,
categorías/tipos básicos 4/23,
señalética/materiales 24/3, salud 5, seguridad 4, comunicación 8, amenazas 8, política
4, actividades XLSM 56 (59 totales por las 3 opciones técnicas preexistentes), promoción
8 y formación 17. No quedaron huérfanos en las relaciones de criterios, servicios
básicos, facilidades o actividades y ningún código excede el límite de 50 caracteres.

La API conserva la consulta dinámica de estos registros mediante `GET /admin/catalogs`;
no fue necesario duplicar listas en el código del servidor o del panel.
