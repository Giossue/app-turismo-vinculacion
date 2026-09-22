# Catálogo jerárquico del catastro

Fecha: 2026-09-21  
Estado: completado; la semántica de categorías y el perfil visual por clasificación se
completaron en `20260922_establishment_semantic_taxonomy.sql`

## Objetivo

Conectar la categoría de cada establecimiento con una taxonomía administrable y
dependiente de actividad y clasificación. La clasificación de atractivos de las fichas
(`categorias_atractivo`) no se reutiliza porque representa otro dominio.

## Alcance

- Crear catálogos PostgreSQL para actividad, clasificación y categoría del catastro.
- Cargar las combinaciones observadas en `Consolidado-Nacional-2026-publico-8 (1).xlsx`.
- Normalizar las etiquetas de categoría conocidas (`2 Tazas`, `1 Estrella`, etc.) y
  conservar alias del valor original para importación y trazabilidad.
- Relacionar los establecimientos con los IDs de catálogo sin eliminar sus columnas de
  texto actuales.
- Exponer las opciones jerárquicas en `GET /admin/catalogs`.
- Cambiar alta/edición y filtros del catastro a selectores dependientes reutilizables.
- Habilitar la administración de categorías del catastro en la pantalla Catálogos.

## Reglas

- Actividad → clasificación → categoría; nunca se muestra una lista universal de
  categorías.
- `categorias_atractivo` queda reservado para centros y atractivos turísticos.
- El texto existente del consolidado se conserva; al editar mediante el catálogo se
  escribe la etiqueta canónica y se guarda el ID relacionado.
- Las opciones se desactivan lógicamente y sus cambios se auditan.
- Los establecimientos legacy sin correspondencia conservan su texto y muestran una
  opción de compatibilidad hasta que sean normalizados.

## Verificación

- Migración idempotente desde el baseline y sobre la muestra de catastro.
- Pruebas API para devolver catálogos, validar la relación jerárquica y guardar el ID.
- `pnpm --filter @turismo/api typecheck`, lint y tests.
- `bun run verify` en `web-turismo-admin`.

## Fuera de alcance

- Importación masiva Excel/CSV completa.
- Reemplazar los valores históricos del consolidado sin alias de fuente.
- Reutilizar o modificar la taxonomía de atractivos de las fichas.
