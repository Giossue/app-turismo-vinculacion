# Retirar activación del panel de centros

## Objetivo

Mostrar únicamente `BORRADOR`, `EN_REVISION` y `PUBLICADO` en centros turísticos.
La solicitud elimina toda presentación de activación en este módulo del panel.

## Trabajo

- [x] Retirar columna y filtro del inventario; descartar `active` de enlaces antiguos.
- [x] Retirar control del editor, dato del resumen de ficha y tarjeta «Inactivos».
- [x] Retirar la mutación de activación del cliente y conservar el guardado y revisión.
- [x] Actualizar documentación y ajustar pruebas existentes al contrato del panel.
- [ ] Verificar formato, lint, TypeScript y pruebas focales.

## Alcance

La API conserva el dato interno y sus permisos existentes; no se modifica la base remota.
Los controles independientes de Catastro y Catálogos permanecen en sus módulos.
El listado consulta todos los centros por estado y búsqueda, sin un criterio oculto de activación.
No se crean commits ni se realiza push o despliegue desde esta tarea.
