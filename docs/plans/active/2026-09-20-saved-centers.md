# Plan: Guardados en la aplicación móvil

Fecha: 2026-09-20

## Objetivo

Permitir que una persona guarde centros turísticos desde la ficha y los consulte
desde `Menú > Guardados`.

## Alcance

- Migrar una sola vez los guardados locales de versiones anteriores al iniciar sesión. Desde
  el refactor de calidad del 22 de septiembre la lista ya no se replica en el dispositivo
  (ver `docs/architecture/mobile.md`).
- Compartir el mismo estado entre la ficha del mapa, la ficha completa y la pantalla
  `Guardados`.
- Abrir la ficha completa desde cada elemento guardado y permitir quitarlo.
- Mantener el orden más reciente primero y soportar el estado vacío.
- Añadir sesión móvil con access token en memoria y refresh token en SecureStore.
- Sincronizar guardados con `favoritos_centros` mediante la cuenta autenticada.

## Límite actual

El esquema PostgreSQL ya contiene `favoritos_centros` y
`favoritos_puntos_interes`. La app móvil usa ahora el contrato separado
`/auth/mobile/*`; no reutiliza la cookie de la sesión institucional. Guardar y abrir
`Guardados` requieren una cuenta turística; la exploración pública sigue disponible como
invitado. Los resúmenes locales heredados se incorporan a la cuenta al autenticarse.

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

Implementado y verificado con TypeScript, lint, pruebas móviles/API y exportación web.
