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

## Verificación prevista

- Conteos reales, estado efectivo, autorización y pertenencia de registros en API.
- Pendiente frente a novedad, lectura, fechas inválidas y aislamiento de cuentas en web.
- Punto pequeño, accesibilidad y navegación en escritorio y móvil.
- TypeScript, lint y verificaciones focales de ambos repositorios.

## Estado

En implementación.
