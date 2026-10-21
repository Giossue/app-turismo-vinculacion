# Design

## Diccionario

`messages/es/<sección>.ts` define los textos de referencia y el tipo `Messages = typeof es`. Cada `messages/en/<sección>.ts` se declara como `Messages["<sección>"]`, de modo que TypeScript rechaza claves faltantes, sobrantes o funciones con otra firma. Los textos con datos son funciones.

## Idioma activo

`language.ts` no depende de React Native: guarda el idioma, notifica cambios y expone `messages()`, `getAppLocale()`, `getSpeechLanguage()` y `liveMessages()`. `use-language.ts` añade `expo-localization`, la preferencia guardada y los hooks `useMessages`, `useLanguage` y `useLanguagePreference`. El layout raíz llama `initLanguage()` antes del primer render; la tarea de navegación en segundo plano la espera antes de publicar textos.

## Contenido de la API

Nombres, descripciones, categorías y textos libres publicados se muestran tal como llegan. Las indicaciones de ruta se reconstruyen en inglés con `getStepInstruction`; en español se conserva el texto de la API. Con `useServerMessage`, en inglés se usa `serverMessageFallbacks` por estado HTTP o el mensaje genérico del cliente.

## Agente

El móvil envía `language: "en"` solo en inglés, para no cambiar las peticiones en español. La API acepta el campo opcional y ajusta la regla de estilo del prompt.
