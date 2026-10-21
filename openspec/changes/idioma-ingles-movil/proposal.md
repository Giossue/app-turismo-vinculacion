# Proposal

## Why

La app solo hablaba español: los turistas extranjeros no podían entender pantallas, avisos, errores ni la voz de navegación. Los textos estaban repartidos por pantallas, clientes de la API y la tarea en segundo plano, sin un lugar común.

## What Changes

- Diccionario tipado español/inglés en `core/i18n`, con comprobación de claves al compilar y en pruebas.
- Idioma inicial según el dispositivo (español como respaldo) y selector «Idioma» en Configuración, guardado en el dispositivo.
- Todos los textos visibles, etiquetas de accesibilidad, avisos, errores locales, notificaciones y voz de navegación pasan por el diccionario.
- Fechas, horas y números con el locale del idioma; voz en `es-ES` o `en-US`.
- Indicaciones de ruta en inglés reconstruidas desde la maniobra de cada paso.
- Errores redactados por la API en español se sustituyen en inglés por textos por estado HTTP.
- El agente recibe el idioma de la interfaz y responde en inglés cuando corresponde.
- ADR-0007.

## Capabilities

### New Capabilities

- `mobile-language`: interfaz del móvil en español o inglés.

### Modified Capabilities

Ninguna.

## Impact

Móvil: nueva dependencia nativa `expo-localization` (requiere reconstruir el APK) y nuevo módulo `core/i18n`. API: campo opcional `language` en el chat del agente (`es` | `en`); sin migraciones. El contenido publicado no se traduce.
