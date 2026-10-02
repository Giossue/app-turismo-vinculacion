# Chat sin vista de historial y con veinte mensajes

## Solicitud

Retirar la visualización del historial del agente y permitir como máximo veinte
mensajes del usuario por chat. Para seguir preguntando, iniciar un chat nuevo.

## Alcance y decisiones

- Retirar el botón, panel, cliente de consulta y restauración del historial móvil.
- Contar mensajes del usuario, incluidos los que tienen respuesta fallida o detenida.
  El saludo y las respuestas del agente no consumen mensajes.
- Reintentar una respuesta o repetir una consulta con GPS reutiliza el turno existente.
- Bloquear nuevos envíos por texto, voz y consultas rápidas al alcanzar veinte; mostrar
  un aviso y la acción «Nuevo chat». El envío también valida el límite con estado actual.
- Iniciar un chat nuevo o cambiar de cuenta reinicia el contador; cerrar/reabrir la hoja
  mantiene el chat y su contador mientras Explorar siga montado.
- Mantener el contexto acotado del modelo y la persistencia consentida de la API.
  La solicitud cambia la visualización del historial, sin borrar registros existentes.
- Mantener consultas de catálogo, ubicación opcional, voz y rutas confirmadas.
- Ubicar «+» a la izquierda del encabezado, en la fila del cierre, y el contador
  abajo a la derecha, justo encima del campo de mensajes, según el ajuste solicitado.

## Verificación

- Pruebas de los límites 19/20/21, errores, cancelación, reintentos, GPS y reinicio.
- Formato, lint, tipos, pruebas y exportación del móvil.
- Actualizar especificación y arquitectura; informar verificación en dispositivo.

## Estado

Implementado y verificado en código.

## Resultados

- Móvil: 41 archivos y 196 pruebas correctas. Las 16 pruebas del dominio de
  conversación pasaron también tras el ajuste de sus casos de reintento.
- Formato, lint, tipos y exportación web del móvil correctos para la retirada del
  historial y el límite. El ajuste final de posiciones se revisó por diff y tipos.
- Eliminados panel, consultas y restauración del historial móvil.
- El vigésimo mensaje se permite; una nueva pregunta posterior se rechaza.
  Reintentos y GPS conservan el turno, incluso con mensajes posteriores.
- La API y los registros persistidos no se modificaron.
- No se realizó prueba manual en Android/iOS ni despliegue.
