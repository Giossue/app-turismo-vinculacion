# Retiro de Tailwind del repositorio actual

## Objetivo

Eliminar Tailwind y sus integraciones del monorepo actual. `apps/web` conservará su
funcionalidad mínima con CSS convencional hasta que se traslade al repositorio web
independiente.

## Alcance

- Quitar dependencias y configuración de Tailwind/PostCSS del paquete web.
- Reemplazar clases utilitarias y el componente HeroUI que dependía de Tailwind por
  marcado semántico y CSS global convencional.
- Actualizar documentación para que el stack actual no prometa Tailwind.

## Fuera de alcance

- Rediseñar la experiencia web.
- Cambiar la aplicación móvil, que ya no usa Tailwind.

## Verificación

- Buscar referencias de runtime y dependencias a Tailwind/NativeWind.
- Ejecutar formato, lint y typecheck de `apps/web`.
- Ejecutar pruebas y `git diff --check`.

## Estado

Implementado y verificado. El plan queda como registro de la retirada; no hay dependencias,
configuración ni clases utilitarias de Tailwind en el código actual.
