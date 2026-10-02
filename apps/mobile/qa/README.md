# Responsividad móvil: aplicación de prueba

Esta entrada Expo está separada de las rutas y del arranque del producto. Usa sus
componentes visuales reales y datos ficticios para probar dimensiones, texto ampliado,
orientación y teclado sin sesión, ubicación ni API. Las dependencias se resuelven desde
`apps/mobile/node_modules`; no hay que instalar paquetes en esta carpeta.

Desde la raíz del monorepo:

```bash
corepack pnpm --dir apps/mobile exec expo start qa --port 8092
corepack pnpm --filter @turismo/mobile typecheck
```

La aplicación de prueba registra su raíz con `registerRootComponent`, en vez de Expo
Router. Puede abrirse en un binario de desarrollo con los módulos nativos del móvil.
Si se genera un binario dedicado, su identificador es
`ec.edu.ueb.turismovinculacion.software.qa`.

## Escenarios

Los enlaces `turismo-vinculacion://qa?screen=tabs|chat|route|form|search` seleccionan y reinician
cada escenario, incluso cuando ya está abierto:

| Escenario | Controles para automatización                                                                                                                                            |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tabs`    | Información, Opiniones, Fotos; Explorar, Guardados, Menú. La selección emite `QA_TAB:Opiniones`, etc.                                                                    |
| `chat`    | Escribe una consulta al agente; Enviar mensaje; QA Reiniciar conversación. La tarjeta incluye los tres modos, Sin ruta y No disponible.                                  |
| `route`   | Iniciar navegación; Expandir detalles de la ruta; Contraer detalles de la ruta; QA Alternar panel de ruta. Arranca compacto.                                             |
| `form`    | QA Nombre, QA Correo, QA Comentario, QA Enviar formulario. Al enviar muestra `QA_FORM:submitted`.                                                                        |
| `search`  | QA Abrir búsqueda; Buscar atractivos, servicios y lugares; escribir `cafe`; enviar desde el teclado conserva la lista; seleccionar muestra `QA_SEARCH:selected:service`. |

Cada escenario expone el nodo accesible y log
`QA_METRICS:<screen>:<width>:<height>:<fontScale>` con dimensiones reales de React Native.
Solo esa etiqueta y el selector auxiliar de ruta evitan escalado; los componentes bajo
prueba conservan el comportamiento del producto.

El resolver Metro sustituye **solo** `useAgentVoiceInput` por un fixture, porque ese hook
instancia el grabador y usa Auth/transcripción. El chat, sus burbujas, tarjetas de tiempos,
compositor, scroll y manejo de teclado son reales. Esta verificación no cubre login,
permisos, audio, GPS, mapas, respuestas de la API ni iOS por ejecución en Android.

La escena de búsqueda usa el estado y la lista del producto, con resultados ficticios.
Comprueba opciones visibles sobre el teclado, permanencia después de enviar y selección
con un toque. El historial guarda únicamente texto en el emulador aislado; no utiliza
datos del teléfono. No consulta la API ni verifica la navegación del mapa real.

El runner ADB y la preparación del emulador están documentados en
[mobile-responsive-checks.md](../../../docs/quality/mobile-responsive-checks.md).
El Metro de QA observa los componentes y assets del paquete móvil para que los
cambios del producto se incorporen a las siguientes comprobaciones.

Fuentes de la configuración:
[Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/expo/),
[Metro de Expo](https://docs.expo.dev/guides/customizing-metro/),
[enlaces RN 0.86](https://reactnative.dev/docs/0.86/linking),
[dimensiones RN 0.86](https://reactnative.dev/docs/0.86/usewindowdimensions),
[KeyboardAvoidingView RN 0.86](https://reactnative.dev/docs/0.86/keyboardavoidingview).
