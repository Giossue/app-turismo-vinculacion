# Retirar activación del panel de centros

## Objetivo

Mostrar únicamente `BORRADOR`, `EN_REVISION` y `PUBLICADO` en centros turísticos.
La solicitud elimina toda presentación de activación en este módulo del panel.

## Trabajo

- [x] Retirar columna y filtro del inventario; descartar `active` de enlaces antiguos.
- [x] Retirar control del editor, dato del resumen de ficha y tarjeta «Inactivos».
- [x] Retirar la mutación de activación del cliente y conservar el guardado y revisión.
- [x] Actualizar documentación y ajustar pruebas existentes al contrato del panel.
- [x] Verificar formato, lint, TypeScript y pruebas focales.

## Alcance

La API conserva el dato interno y sus permisos existentes; no se modifica la base remota.
Los controles independientes de Catastro y Catálogos permanecen en sus módulos.
El listado consulta todos los centros por estado y búsqueda, sin un criterio oculto de activación.
El usuario autorizó crear los commits y publicar los cambios mediante push al terminar.
No se modifica la base remota ni se ejecuta un despliegue manual.

## Verificación

- Prettier sobre todos los archivos editados y `git diff --check` en ambos repositorios.
- `bun run lint` y `bun run typecheck` completados sin errores.
- 26 pruebas existentes aprobadas: navegación/URL, contrato de revisión, guardado en serie
  y permisos/ayudas del panel. Los enlaces antiguos conservan estado y página sin `active`.
- Revisión de referencias: no quedan controles ni indicadores de activación de centros;
  se retiró también la tarjeta «Inactivos» del resumen general y se ajustó su cuadrícula.
- Un proceso externo creó el commit `9b35ef0` en el repositorio web durante el trabajo.
  La autorización posterior del usuario permite publicar los cambios restantes.
  No se realizó QA con sesión real.
