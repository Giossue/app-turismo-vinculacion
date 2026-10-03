# Menú de acciones por fila

## Objetivo

Reducir la carga visual de las tablas: un único botón de tres puntos sin borde en
la columna Acciones abre un popover con las opciones de la fila.

## Trabajo

- [x] Crear menú compartido accesible y conservar la confirmación de eliminación fuera del popover.
- [x] Integrar Centros, Catastro, Catálogos, Opiniones y las dos colas de revisión.
- [x] Agrupar también las acciones de categorías y trasladar Ver categorías al menú del tipo.
- [x] Conservar permisos, pending, callbacks, auditoría por API e invalidación de consultas.
- [ ] Verificar formato, lint, TypeScript y comportamiento del menú/diálogos.
- [ ] Publicar los cambios mediante push, conforme a la autorización vigente del usuario.

## Alcance

Sólo cambia la presentación y apertura de las acciones existentes. La eliminación conserva
su confirmación, error recuperable y protección durante el envío. No se modifica la API
ni la base remota. No se ejecuta un despliegue manual.
