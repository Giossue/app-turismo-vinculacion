# Indicador de carga unificado del panel

## Objetivo

Unificar los estilos de carga que aparecen al navegar por las opciones y pantallas del
portal administrativo. Todas las superficies usan el mismo indicador circular.

## Trabajo

- [x] Crear LoadingSpinner compartido y LoadingState para contenido centrado.
- [x] Integrar sesión, resumen, ContentState y overlay de tablas con/sin filas.
- [x] Unificar también indicadores de botones y generación de propuestas.
- [x] Actualizar documentación y revisar que no queden barras ni esqueletos de carga.
- [ ] Verificar tipos, lint y presentación del overlay con y sin datos.
- [ ] Preparar el push solicitado por el usuario.

## Alcance

Los indicadores conservan etiquetas accesibles; dentro de botones se adaptan al tamaño
y color de texto para mantener contraste. Se conservan las consultas, permisos,
confirmaciones, bloqueo de doble envío y estados pendientes existentes. La tarea no
modifica la API ni la base remota.
