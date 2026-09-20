# Plan: Guardados en la aplicación móvil

Fecha: 2026-09-20

## Objetivo

Permitir que una persona guarde centros turísticos desde la ficha y los consulte
desde `Menú > Guardados`.

## Alcance

- Persistir los centros guardados por dispositivo mediante AsyncStorage.
- Compartir el mismo estado entre la ficha del mapa, la ficha completa y la pantalla
  `Guardados`.
- Abrir la ficha completa desde cada elemento guardado y permitir quitarlo.
- Mantener el orden más reciente primero y soportar el estado vacío.

## Límite actual

El esquema PostgreSQL ya contiene `favoritos_centros` y
`favoritos_puntos_interes`, pero el móvil todavía no tiene registro ni sesión
turística. Esta primera unidad no inventa un `usuario_id`: los guardados son locales
al dispositivo. La sincronización con las tablas remotas se implementará junto con
la cuenta turística y su contrato de sesión.

## Datos y privacidad

- No se guarda ubicación ni historial de navegación.
- Solo se conserva el resumen público del centro necesario para pintar la lista.
- El centro completo continúa viniendo de la API al abrir la ficha.

## Verificación

- Pruebas de persistencia y orden de guardados.
- Lint, TypeScript y pruebas del paquete móvil.
- Exportación web del paquete móvil.
- Comprobación manual de guardar, abrir `Guardados` y quitar un centro.

## Estado

Implementado y verificado con TypeScript, lint, 24 pruebas móviles y exportación web.
