# Menú de acciones por fila

## Objetivo

Reducir la carga visual de las tablas: un único botón de tres puntos sin borde en
la columna Acciones abre un popover con las opciones de la fila.

## Trabajo

- [x] Crear menú compartido accesible y conservar la confirmación de eliminación fuera del popover.
- [x] Integrar Centros, Catastro, Catálogos, Opiniones y las dos colas de revisión.
- [x] Agrupar también las acciones de categorías y trasladar Ver categorías al menú del tipo.
- [x] Conservar permisos, pending, callbacks, auditoría por API e invalidación de consultas.
- [x] Verificar formato, lint, TypeScript y comportamiento del menú/diálogos.
- [x] Preparar la publicación mediante push, conforme a la autorización vigente del usuario.

## Alcance

Sólo cambia la presentación y apertura de las acciones existentes. La eliminación conserva
su confirmación, error recuperable y protección durante el envío. No se modifica la API
ni la base remota. No se ejecuta un despliegue manual.

## Verificación

- Prettier focal, ESLint global, TypeScript y `git diff --check` aprobados.
- 35 pruebas existentes aprobadas: eliminación autenticada y sus errores/renovación,
  navegación, revisión y serialización del guardado de centros.
- Smoke Chromium con componentes y tema reales: menú sin borde, Escape/clic fuera,
  opciones deshabilitadas, permisos, apertura de editor/confirmación y foco correctos.
  Seleccionar Eliminar sólo abre el diálogo y no envía la solicitud.
- El smoke detectó un doble envío al confirmar con dos clics nativos muy rápidos.
  Se añadió un bloqueo síncrono hasta finalizar la mutación; Cancelar/Escape respetan
  ese bloqueo. Se verificó envío único, reintento tras error y desbloqueo tras éxito.
- Nueve comprobaciones finales del diálogo y foco aprobadas, sin errores de consola.
  Fixture y evidencia temporal fuera de git; servidor y navegador de QA detenidos.
