# Feedback y estados

El móvil reutiliza componentes de `core/ui` para carga, vacío, error, Snackbar,
toast y controles. Mantener los datos útiles mientras una consulta se actualiza,
sin mostrar datos de otra identidad. No confundir consulta vacía con fallo de red.

Cada acción explica pendiente, resultado o error recuperable. No emitir éxito
antes de confirmar la operación; un timeout de escritura puede dejar resultado
desconocido. Reconciliarlo con la API antes de repetir una operación costosa.

En maps y ubicación, distinguir permiso denegado, proveedor apagado, posición
antigua, lectura pendiente y destino sin ruta. En offline, distinguir contenido
guardado, descarga pendiente, cancelada, fallida y actualización disponible.

El chat permite detener y reintentar, conservando turnos completados. Cerrar la
sheet cancela la respuesta en curso; no promete un trabajo duradero en servidor.
Una función futura de jobs necesita persistencia, estado y cancelación propios.

Los flujos exactos se documentan en [mobile.md](mobile.md), [AI](ai.md) y specs.
La evidencia de esta adopción no es una revisión visual de Android/iOS.
