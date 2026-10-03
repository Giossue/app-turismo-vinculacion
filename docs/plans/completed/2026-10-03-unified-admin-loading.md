# Indicador de carga unificado del panel

## Objetivo

Unificar los estilos de carga que aparecen al navegar por las opciones y pantallas del
portal administrativo. Todas las superficies usan el mismo indicador circular.

## Trabajo

- [x] Crear LoadingSpinner compartido y LoadingState para contenido centrado.
- [x] Integrar sesión, resumen, ContentState y overlay de tablas con/sin filas.
- [x] Unificar también indicadores de botones y generación de propuestas.
- [x] Actualizar documentación y revisar que no queden barras ni esqueletos de carga.
- [x] Verificar tipos, lint y presentación del overlay con y sin datos.
- [x] Preparar el push solicitado por el usuario.

## Alcance

Los indicadores conservan etiquetas accesibles; dentro de botones se adaptan al tamaño
y color de texto para mantener contraste. Se conservan las consultas, permisos,
confirmaciones, bloqueo de doble envío y estados pendientes existentes. La tarea no
modifica la API ni la base remota.

## Verificación

- Prettier focal, TypeScript y ESLint global aprobados; revisión de diff sin errores.
- Referencias de `CircularProgress` sólo en el componente compartido; no quedan
  `LinearProgress` ni `Skeleton` en las cargas del panel.
- Smoke Chromium con tema real: contenido, sesión y tablas muestran el mismo círculo
  de 32 px, color primario, grosor 3.6 y animación de 1.4 s.
- Overlay vacío y con filas centrado y sin recortes a 1280 y 360 px. Al terminar la carga
  desaparece el indicador y se muestran los datos o el estado vacío.
- Búsqueda y paginación conservan sus nodos durante el cambio de carga. Sin errores de
  consola; servidor y navegador de QA detenidos, evidencia temporal fuera de git.
