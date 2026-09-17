# React Native, Expo y mapa de descubrimiento

## Objetivo

Sustituir Flutter/ArcGIS Flutter por React Native/Expo/MapLibre y entregar un primer
cliente móvil que presenta el mapa y los atractivos públicos de Guaranda desde la API
existente, desarrollado y comprobado desde Linux.

## Alcance

- Actualizar las fuentes de verdad del stack y registrar el ADR de sustitución.
- Inicializar `apps/mobile` con Expo Router, TypeScript estricto y desarrollo con pnpm.
- Integrar MapLibre mediante el plugin oficial de Expo; el proyecto exige development
  build, nunca Expo Go, para cargar el módulo nativo.
- Mostrar mapa, marcadores de centros publicados y listado/ficha resumida desde la API.
- Estados de carga, vacío, error, reintento y uso sin ubicación.
- Pruebas de conversión de datos y repositorio; análisis TypeScript aplicable.

## Fuera de alcance

- GPS, permisos, navegación, rutas, offline, cuentas, favoritos, multimedia y IA.
- Credenciales de un proveedor de rutas; el mapa usa un estilo público de desarrollo.
- Compilar o probar iOS localmente. Las builds iOS se harán en EAS macOS cloud cuando
  exista cuenta Expo y Apple Developer.

## Seguridad y datos

- El cliente solo llama a la API pública; no accede a PostgreSQL, Redis ni MinIO.
- La URL API se inyecta por variable pública de Expo y no contiene secreto.
- Ninguna ubicación se solicita o registra en esta feature.
- El estilo de mapa de desarrollo no es una credencial de producción.

## Verificación

- `pnpm --filter @turismo/mobile lint`, `typecheck` y `test`.
- Desarrollo Android mediante Expo/Development Build al instalar Android SDK.
- API local: `http://10.0.2.2:3000/api/v1` en emulador Android; no `localhost`.

## Riesgos

- MapLibre no funciona en Expo Go; exige un build de desarrollo tras la configuración
  nativa.
- La disponibilidad, atribución y licencia de tiles de producción se resolverán antes de
  lanzar el servicio; no se reutiliza el estilo de demostración en producción.

## Estado

Completado el 2026-09-16.

## Resultado

- Cliente `apps/mobile` creado con Expo Router, TypeScript, NativeWind, TanStack Query,
  validación Zod y MapLibre React Native.
- La consulta pública de centros valida la respuesta de la API y contempla carga, error,
  reintento y estado vacío, sin solicitar ubicación del usuario.
- El plugin nativo de MapLibre pasó `expo prebuild` y el development build Android se
  compiló, instaló y abrió en el emulador local `Pixel_API34`.
- `pnpm verify` valida formato, lint, tipos, pruebas y build web del monorepo.
- Pendiente para una publicación: identificador institucional de iOS, EAS, Apple
  Developer y un proveedor de estilo/tiles de producción. El identificador Android es
  `ec.edu.ueb.turismovinculacion.software`.
