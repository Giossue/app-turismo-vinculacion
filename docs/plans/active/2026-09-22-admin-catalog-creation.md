# Plan: altas administrativas de catálogos

Fecha: 2026-09-22
Estado: implementado

## Objetivo

Permitir que `ADMINISTRADOR` cree opciones de accesibilidad, actividades, facilidades,
tipos y categorías de catastro desde el panel, conservando relaciones padre, códigos
generados por el servidor, validación y auditoría.

## Alcance

- Añadir `POST /admin/catalogs/:catalog` para los cinco catálogos editables del panel.
- Exigir grupo para actividades, categoría de facilidad para facilidades, actividad para
  tipos de establecimiento y clasificación para categorías de catastro.
- Mantener `tourism-monument` reservado para centros turísticos.
- Incorporar el diálogo de alta accesible y contextual en el panel web.
- Actualizar contrato, pruebas y documentación.

## Verificación

- Pruebas API de relaciones, códigos, auditoría y duplicados.
- Typecheck, lint y build del API y panel.
- Verificación de que las altas aparecen tras invalidar el catálogo.

## Resultado

- `POST /admin/catalogs/:catalog` implementado para accesibilidad, actividades, facilidades,
  tipos y categorías de catastro.
- El panel muestra un alta contextual con selección de padre, ícono para tipos de
  establecimiento y sistema/valor numérico para categorías.
- No requiere migración: el esquema y la auditoría existentes ya soportan estas altas.

## Verificación realizada

- API: typecheck correcto y 130 pruebas pasando.
- Panel: formato y lint de los archivos modificados correctos.
- El typecheck/lint global del panel continúa reportando errores previos en
  `coordinate-picker-dialog.tsx`, sin relación con catálogos.
