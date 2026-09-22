# Ubicación foreground confiable en mapa y navegación

## Objetivo

Evitar que la app muestre o use como actual una coordenada antigua o una lectura GPS
con precisión insuficiente. El mapa, el cálculo de rutas y la navegación deben esperar
una lectura fresca y aceptable, sin bloquear el catálogo cuando la ubicación no está
disponible.

## Decisiones

- No usar `getLastKnownPositionAsync` para centrar el mapa ni iniciar una ruta.
- Usar lecturas foreground con `Location.Accuracy.High` y aceptar únicamente coordenadas
  cuya precisión reportada sea de 100 m o menos.
- Ignorar muestras imprecisas tanto en el watcher foreground como en la navegación visible
  y en la tarea de segundo plano.
- No restaurar una posición persistida como posición actual al abrir o reanudar la
  navegación; queda reservada para continuidad del servicio hasta recibir un punto fresco.
- Mantener el catálogo y el mapa utilizables si no hay permiso, GPS o señal suficiente.

## Verificación

- Prueba unitaria de la regla de precisión.
- TypeScript, lint y pruebas del paquete móvil.
- Revisar que las rutas fuerzan una lectura fresca antes de calcular o iniciar navegación.
