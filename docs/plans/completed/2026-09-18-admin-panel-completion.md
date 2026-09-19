# Plan: completar panel administrativo

## Objetivo

Convertir `web-turismo-admin` en un panel operativo coherente: resumen con métricas,
cola de revisión, catálogo consultable de centros turísticos y configuración de la
sesión/preferencias. La API seguirá siendo la frontera de autorización y PostgreSQL
continuará como fuente de verdad.

## Alcance

1. Exponer desde `apps/api` una consulta administrativa de resumen y conservar la
   consulta paginada de centros con búsqueda/estado.
2. Separar el shell del panel en secciones navegables sin duplicar datos ni crear
   conexiones directas a PostgreSQL desde Next.js.
3. Implementar estados de carga, vacío, error, filtros, paginación y acciones de
   revisión con feedback accesible.
4. Completar Configuración con información de cuenta, preferencias de tema y cierre
   de sesión; no guardar tokens ni credenciales en `localStorage`.
5. Mantener el diseño plano: bordes sutiles, sin sombras, radios contenidos y tokens
   MUI reutilizables.

## Fuera de alcance de esta unidad

- Captura completa de las 14 secciones de una ficha, carga multimedia y editor de
  catálogos; requieren contratos y permisos específicos adicionales.
- Cambios de esquema: las consultas usan las tablas existentes y sus estados.

## Verificación

- API: formato, lint, typecheck y pruebas unitarias.
- Web: `bun run verify` en `web-turismo-admin`.
- Comprobar que las rutas administrativas requieren sesión y que los roles se aplican
  en la API; documentar cualquier pendiente en el cierre.

## Resultado

Completado el 2026-09-18. Se añadieron Resumen, Centros turísticos, filtros/paginación,
confirmación de revisión con observación, Configuración y control de permisos visible.
La API expone `GET /admin/summary`, amplía `GET /admin/centers` para inventario activo e
inactivo y conserva la revisión auditada. La captura completa de las 14 secciones y los
catálogos siguen fuera de esta unidad.

Verificación ejecutada: `bun run verify` en `web-turismo-admin` y formato, lint,
typecheck y 16 pruebas Vitest en `apps/api`.
