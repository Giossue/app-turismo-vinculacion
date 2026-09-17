# Cliente móvil

Cliente turístico para Android e iOS construido con React Native, Expo Router y
MapLibre React Native. Consume únicamente la API pública; nunca se conecta de forma
directa a PostgreSQL.

## Requisitos locales

- Node.js 22.13 o superior y Corepack.
- Android SDK y un emulador para Android. En este equipo se usa `Pixel_API34`.
- Para el mapa nativo, un **development build**: MapLibre no es compatible con Expo
  Go.

## Desarrollo en Android

```bash
# Desde la raíz del repositorio
cp apps/mobile/.env.example apps/mobile/.env
podman start turismo-vinculacion-postgres
corepack pnpm dev:api

# En otra terminal, tras arrancar el emulador Android
corepack pnpm --filter @turismo/mobile android
```

La configuración por defecto de `.env.example` usa `10.0.2.2`, que es la dirección
desde el emulador Android hacia la API que corre en tu máquina. En un dispositivo
físico se debe sustituir por la IP privada de la máquina de desarrollo, sin añadir
secretos al archivo.

El móvil no necesita claves de IA: la pantalla `Agente` envía la consulta a
`/api/v1/ai/chat` y las claves de OpenAI/Anthropic permanecen en el backend.

El primer `android` genera el development build e instala la aplicación. Después se
puede levantar Metro con:

```bash
corepack pnpm --filter @turismo/mobile start -- --dev-client
```

## Calidad

```bash
corepack pnpm --filter @turismo/mobile format
corepack pnpm --filter @turismo/mobile lint
corepack pnpm --filter @turismo/mobile typecheck
corepack pnpm --filter @turismo/mobile test
```

## Configuración que falta antes de publicar

- El identificador Android se definió como
  `ec.edu.ueb.turismovinculacion.software`. No debe cambiarse después de publicar,
  porque Google Play lo trataría como otra aplicación.
- Definir identificador de iOS, cuenta Expo/EAS y cuenta Apple Developer.
- Contratar/configurar un estilo y proveedor de tiles de producción. El estilo actual
  es solo una demostración sin garantía de disponibilidad para producción.
