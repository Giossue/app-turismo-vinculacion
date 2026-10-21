# ADR-0007: Inglés en el móvil con un diccionario tipado propio

- Estado: aceptada
- Fecha: 2026-10-20

## Contexto

Rumbo EC solo tenía textos en español escritos en cada pantalla, en mensajes de
error de los clientes de la API, en la voz de navegación y en la notificación de
la tarea en segundo plano. Los turistas extranjeros necesitan la interfaz en
inglés. Varios textos se construyen fuera de React (dominio, datos y la tarea de
ubicación en segundo plano), donde no hay contexto ni hooks.

## Decisión

Un diccionario tipado propio en `apps/mobile/src/core/i18n`, sin librería de i18n:

- `messages/es/*` es la referencia y define el tipo `Messages`; `messages/en/*`
  debe cumplir ese tipo, así que una clave faltante o sobrante no compila.
  `messages.test.ts` compara además claves y aridad de las funciones.
- Los textos con datos son funciones (`stopCount(n)`), lo que cubre plurales y
  orden de palabras sin una sintaxis de interpolación.
- `language.ts` guarda el idioma activo fuera de React. `messages()` sirve a
  dominio, datos y la tarea en segundo plano; `useMessages()` (con
  `useSyncExternalStore`) vuelve a pintar las pantallas al cambiar de idioma.
  `liveMessages()` conserva constantes como `navigationMessages`.
- `use-language.ts` resuelve el idioma con `expo-localization` (primer idioma
  admitido del dispositivo; español si no hay ninguno) y la elección de Ajustes,
  guardada en `rumbo-ec.language-preference.v1`. La tarea de navegación en
  segundo plano espera `initLanguage()` antes de publicar textos.
- El locale de fechas y números es `es-EC` o `en-US`; la voz de navegación usa
  `es-ES` o `en-US`.
- Las indicaciones de ruta llegan redactadas en español por la API; en inglés se
  reconstruyen en el móvil desde la maniobra, la vía y la salida de cada paso.
- Los mensajes de error que la API redacta en español se reemplazan en inglés por
  textos por estado HTTP (`serverMessageFallbacks`) o por el genérico del cliente.
- El agente recibe `language: "en"` y el servidor le indica responder en inglés.

## Alternativas

- i18next + react-i18next: claves en cadenas sin comprobación de tipos sin
  configuración adicional, y una dependencia más para dos idiomas.
- Textos en la API: no cubre los textos locales, sin conexión ni la tarea en
  segundo plano.

## Consecuencias

- El contenido publicado (nombres, descripciones, categorías, horarios, rutas de
  transporte y respuestas libres del servidor) se muestra como llega; traducirlo
  queda fuera de alcance.
- Agregar un idioma requiere un diccionario completo y ampliar `appLanguages`.
- Algunos textos guardados en estado (mensajes ya mostrados, conversaciones del
  agente) conservan el idioma con el que se crearon hasta que se renuevan.
- `expo-localization` es un módulo nativo: requiere reconstruir el APK.
