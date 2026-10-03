# Novedades y pendientes en la navegación administrativa

## Objetivo

Mostrar un único punto rojo, sin contador, en las secciones del sidebar con novedades
sin ver o trabajo pendiente. Mantener las mismas señales en escritorio y menú móvil.

## Diseño

- La API agrega conteos y fechas de cambios en `GET /admin/navigation-summary`.
- Revisión suma centros y catastros enviados; Opiniones cuenta propuestas por moderar.
- Centros cuenta borradores/en revisión y Catastro borradores/rechazados/en revisión.
- Catálogos no tiene cola pendiente: su señal procede de cambios auditados.
- El agente recibe sólo sus centros y catastros; las señales administrativas son vacías.
- Abrir una sección registra la fecha vista por cuenta en el navegador. Leer una novedad
  quita su punto; el trabajo pendiente conserva el punto hasta resolverse.
- Se persisten sólo fechas, nunca credenciales ni contenido. El fallo de almacenamiento
  usa memoria durante la sesión; sin respuesta válida no se inventan notificaciones.
- Se refresca al recuperar foco, cada 30 segundos con el panel visible y tras mutaciones.
- No cambia el esquema, los estados editoriales ni la base remota.

## Verificación

- API: 17 pruebas aprobadas, incluidas ocho consultas reales contra un PostgreSQL
  desechable y nueve pruebas de contrato/roles. Cubren estados propuestos sobre publicados,
  compatibilidad histórica, totales superiores a una página, pertenencia de la auditoría,
  eliminación, versiones de opiniones y novedades de catálogos sin pendientes ficticios.
- API: TypeScript, build, ESLint focal, sintaxis del runner y revisión de diff aprobados.
- Web: 40 pruebas focales aprobadas de señales/lectura, navegación, eliminación y flujo
  editorial; Prettier global, TypeScript, ESLint global y build aprobados.
- Chromium con componentes y hook reales: 16 comprobaciones aprobadas de punto de 8 px
  en escritorio/móvil, etiqueta accesible, lectura, resolución de pendientes, recarga,
  aislamiento de cuentas, errores y almacenamiento bloqueado. Sin errores de consola.
- Servidor y navegador de QA detenidos; PostgreSQL temporal apagado y eliminado.

## Estado

Implementación y documentación completas en API y portal web. Cambios preparados para
el push solicitado. No se accedió a la base remota ni se añadió ninguna dependencia.
