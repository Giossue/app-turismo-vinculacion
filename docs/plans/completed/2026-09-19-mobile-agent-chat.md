# Vista de agente tipo chat

## Objetivo

Simplificar la vista móvil de Agente para que se comporte y se perciba como una
conversación tipo ChatGPT, sin cambiar el contrato de la API ni la navegación hacia las
fichas turísticas.

## Resultado

- Se eliminó la tarjeta introductoria y el subtítulo decorativo.
- Se eliminó el encabezado superior de la pestaña para aprovechar el espacio del chat.
- Los mensajes ahora ocupan una lista conversacional limpia: usuario y agente usan una
  burbuja menos redondeada, y la tarjeta del atractivo queda contenida dentro de la
  respuesta del agente.
- Se eliminó la línea de fuentes de la interfaz y se conservó la navegación a fichas.
- El compositor quedó fijo al pie, con entrada multilinea y acción de enviar por icono.
- La conversación se desplaza automáticamente al último mensaje cuando cambia su contenido.
- El compositor usa `KeyboardAvoidingView` con `padding` para desplazarse completamente por
  encima del teclado en Android edge-to-edge.
- Se mantuvieron el envío, el estado de consulta, el teclado, la accesibilidad y la API
  existentes.

## Fuera de alcance

- Streaming de respuestas.
- Persistencia del historial de conversación.
- Cambios en API, dominio, autenticación o proveedor de IA.

## Archivos

- `apps/mobile/src/app/(tabs)/agent.tsx`
- `docs/architecture/mobile.md`

## Verificación

- Prettier del archivo móvil: correcto.
- Typecheck del paquete móvil: correcto.
- Lint del paquete móvil: sin errores; permanece un warning previo en
  `center-map.native.tsx` sobre una dependencia de `useCallback`.
- Pruebas móviles: 3 archivos y 7 pruebas correctas.
- Verificación visual en Motorola Edge 50 Fusion conectado por USB: el teclado ya no tapa
  el compositor.

## Estado

Completado.
