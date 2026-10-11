# Formularios y flujos

Los formularios móviles actuales mantienen estado y validación de dominio de su
feature, con componentes Paper/Tourism y contratos Zod donde están declarados.
React Hook Form pertenece al panel separado; no añadirlo al móvil por una plantilla.

Pedir solo datos que la persona aporta. No exponer IDs ni convertir una casilla
vacía en una negativa. Errores de campo explican corrección y conservan los datos
cuando el flujo permite reintento. Una respuesta de publicación pertenece a la API.

## Permisos y continuidad

Explicar finalidad junto al control y solicitar el permiso al activarlo.
Foreground precede a background; rechazo, cancelación y GPS apagado conservan
alternativas. Cancelar nunca inicia navegación. Los cambios nativos de permisos
requieren reconstrucción del binario.

## Operación institucional

El panel registra borradores, envía a revisión y publica mediante la API. Guardar
progreso no implica aprobación. Eliminar lógicamente conserva historial y difiere
de desactivar; no ofrecer deshacer si no existe un contrato de reversión.

La ficha MINTUR se analiza en el panel. Su endpoint no escribe; el editor puede
enviar apartados y fotos cuando la ficha tiene código. No trasladar ese parser al
backend ni inventar un job duradero como parte de esta adopción.

Concurrencia y repetición: [idempotency.md](idempotency.md). Detalles móviles:
[mobile.md](mobile.md) y [privacidad](../security/privacy-location.md).
