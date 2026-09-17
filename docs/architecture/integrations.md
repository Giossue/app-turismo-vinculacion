# Integraciones

| Servicio | Propósito | Acceso | Propietario interno |
| --- | --- | --- | --- |
| MapLibre + proveedor de rutas | renderizado de mapas, rutas y navegación futura | estilo público limitado; credenciales de rutas solo en backend | maps |
| Proveedor de IA | texto, visión y voz | API key server-side | ai |
| MinIO/S3 | objetos multimedia | credenciales server-side/URLs firmadas | files |
| FCM/APNs | notificaciones móviles | credenciales server-side | notifications |
| Correo | verificación y recuperación | credenciales server-side | auth |
| Clima | pronóstico y alertas | API server-side | alerts |

## Reglas

- Adaptador tipado por proveedor; dominio no importa SDK externo.
- Timeouts, reintentos acotados, circuit breaker donde sea útil y errores normalizados.
- No reintentar automáticamente operaciones no idempotentes sin clave.
- Validar respuestas externas como entrada no confiable.
- Métricas de latencia, error, cuota y costo.
- Degradación explícita: si IA falla, fichas/mapa continúan; si Redis falla, la fuente
  permanente continúa; si el proveedor de mapas/rutas falla, mostrar lugares sin inventar navegación.
- Webhooks autenticados, con protección contra replay e idempotencia.

## Archivos

Subidas grandes mediante URL firmada de corta duración cuando sea seguro. El backend
autoriza antes de firmar, valida metadata y confirma el objeto antes de publicarlo.

## Datos dinámicos

Pronóstico, cierres y alertas deben mostrar fuente y fecha. No mezclarlos silenciosamente
con el clima histórico de la ficha.
