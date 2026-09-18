# Índice de documentación

Este archivo es el punto de entrada para agentes y personas que trabajen en el proyecto.
Primero identifica la sección de la tarea, lee la fuente interna indicada y después consulta
la documentación oficial de la tecnología antes de escribir o modificar código.

## Regla de consulta

1. Determina el área afectada con las tablas de este índice.
2. Lee el documento interno del proyecto y el `AGENTS.md` más cercano al código.
3. Abre la URL oficial de la librería o plataforma antes de elegir una API, prop o patrón.
4. Si una compilación, prueba, herramienta o integración falla, vuelve a la documentación
   oficial específica y a su guía de troubleshooting antes de intentar una solución por
   intuición.
5. Si la documentación contradice una decisión interna, conserva la decisión interna y
   registra la excepción o actualiza la arquitectura antes de implementar.

## Documentación interna por tarea

| Sección              | Fuente                                                                               | Usar cuando                                                                    |
| -------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Producto             | `product/overview.md`                                                                | Cambie el propósito, alcance, actores o propuesta de valor.                    |
| Módulos              | `product/modules.md`                                                                 | Se agregue o divida una funcionalidad del producto.                            |
| Decisiones           | `product/open-decisions.md`                                                          | Exista una elección de producto pendiente o ambigua.                           |
| Dominio              | `product/domain-model.md`, `product/glossary.md`                                     | Se modifiquen entidades, estados, nombres o reglas del negocio.                |
| Arquitectura general | `../ARCHITECTURE.md`, `architecture/stack.md`                                        | Se elija una tecnología, límite o patrón transversal.                          |
| Móvil                | `architecture/mobile.md`                                                             | Se trabaje en Expo, React Native, navegación, overlays o estado móvil.         |
| Mapas y rutas        | `architecture/maps-navigation.md`                                                    | Se modifiquen MapLibre, pines, cámara, geocodificación, rutas o navegación.    |
| Backend              | `architecture/backend.md`, `architecture/authentication.md`                          | Se modifiquen módulos NestJS, API REST, auth o autorización.                   |
| Datos                | `architecture/database.md`                                                           | Se modifique PostgreSQL, PostGIS, migraciones, índices o consultas espaciales. |
| IA                   | `architecture/ai.md`                                                                 | Se cambien modelos, proveedores, prompts, herramientas o datos enviados a IA.  |
| Integraciones        | `architecture/integrations.md`                                                       | Se conecte un proveedor externo o se cambie un adaptador.                      |
| Despliegue           | `architecture/deployment.md`                                                         | Se cambie Docker Compose, servidores, secretos, almacenamiento o colas.        |
| Calidad              | `quality/definition-of-done.md`, `quality/testing.md`, `quality/mobile-checklist.md` | Se verifique una feature, regresión o entrega móvil.                           |
| Rendimiento          | `quality/performance.md`, `quality/observability.md`                                 | Se diagnostiquen lentitud, consumo, métricas o fallos operativos.              |
| Seguridad            | `security/principles.md`, `security/hardening.md`, `security/threat-model.md`        | Se toquen permisos, datos personales, ubicación, archivos, IA o límites.       |
| Privacidad           | `security/privacy-location.md`                                                       | Se solicite, procese, almacene o elimine ubicación.                            |
| Planes               | `plans/active/`                                                                      | El trabajo sea no trivial o cruce varias capas.                                |
| Generados            | `generated/README.md`                                                                | Se necesite saber cómo regenerar documentación; nunca editarla manualmente.    |

## Fuentes oficiales: móvil y UI

| Tecnología            | Documentación                                                                                                                                                                                                                                                                                                                                                                                                   | Usar cuando                                                                             |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Expo SDK 57           | [docs.expo.dev/versions/v57.0.0](https://docs.expo.dev/versions/v57.0.0/)                                                                                                                                                                                                                                                                                                                                       | Se instale, configure o depure cualquier módulo Expo.                                   |
| Expo Router           | [Router](https://docs.expo.dev/router/introduction/)                                                                                                                                                                                                                                                                                                                                                            | Se creen rutas, layouts, enlaces, tabs o navegación atrás.                              |
| Expo Location         | [Location SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/location/)                                                                                                                                                                                                                                                                                                                                         | Se solicite permiso, se lea GPS o se gestione ubicación apagada.                        |
| React Native 0.86     | [Style](https://reactnative.dev/docs/0.86/style), [dimensiones](https://reactnative.dev/docs/0.86/height-and-width), [Text](https://reactnative.dev/docs/0.86/text), [Pressable](https://reactnative.dev/docs/0.86/pressable), [Modal](https://reactnative.dev/docs/0.86/modal), [BackHandler](https://reactnative.dev/docs/0.86/backhandler), [accesibilidad](https://reactnative.dev/docs/0.86/accessibility) | Se use una API del núcleo, layout adaptable, overlays, Atrás o accesibilidad.           |
| React Native Paper    | [Theming](https://oss.callstack.com/react-native-paper/docs/guides/theming), [Ripple](https://oss.callstack.com/react-native-paper/docs/guides/ripple-effect)                                                                                                                                                                                                                                                   | Se configuren temas, componentes Paper o feedback de pulsación.                         |
| Reanimated 4          | [Getting started](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started/), [timing](https://docs.swmansion.com/react-native-reanimated/docs/animations/withTiming/), [accesibilidad](https://docs.swmansion.com/react-native-reanimated/docs/guides/accessibility/)                                                                                                              | Se creen animaciones, transiciones, layout motion o se respete reducción de movimiento. |
| Gesture Handler       | [Reanimated Drawer Layout](https://docs.swmansion.com/react-native-gesture-handler/docs/components/reanimated-drawer-layout/), [interacción con Reanimated](https://docs.swmansion.com/react-native-gesture-handler/docs/fundamentals/reanimated-interactions/)                                                                                                                                                 | Se creen drawers, gestos nativos o interacción sincronizada con Reanimated.             |
| MapLibre React Native | [Documentación oficial](https://maplibre.org/maplibre-react-native/docs/)                                                                                                                                                                                                                                                                                                                                       | Se modifiquen estilos, fuentes, capas, cámara, símbolos o anotaciones del mapa.         |
| Expo UI               | [SDK UI](https://docs.expo.dev/versions/v57.0.0/sdk/ui/)                                                                                                                                                                                                                                                                                                                                                        | Se use `@expo/ui`, incluidos bottom sheets nativos.                                     |

## Fuentes oficiales: API, datos y operación

| Tecnología     | Documentación                                                                                                                        | Usar cuando                                                          |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| TypeScript     | [Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)                                                                  | Se cambien tipos, genéricos, configuración o contratos.              |
| NestJS         | [Docs](https://docs.nestjs.com/)                                                                                                     | Se creen módulos, controladores, guards, pipes o providers.          |
| Fastify        | [Docs](https://fastify.dev/docs/latest/)                                                                                             | Se configure el adaptador HTTP, hooks, plugins o errores.            |
| PostgreSQL     | [Manual](https://www.postgresql.org/docs/current/)                                                                                   | Se escriban SQL, transacciones, constraints, índices o migraciones.  |
| PostGIS        | [Reference](https://postgis.net/docs/)                                                                                               | Se usen geometrías, SRID, distancias, viewport o índices espaciales. |
| Redis          | [Docs](https://redis.io/docs/latest/)                                                                                                | Se diseñen caché, rate limits, locks o estado temporal.              |
| BullMQ         | [Docs](https://docs.bullmq.io/)                                                                                                      | Se agreguen colas, reintentos, workers o trabajos diferidos.         |
| MinIO / S3     | [MinIO docs](https://min.io/docs/minio/linux/index.html), [AWS S3 API](https://docs.aws.amazon.com/AmazonS3/latest/API/Welcome.html) | Se gestionen fotos, videos, audios, documentos o URLs firmadas.      |
| Docker Compose | [Docs](https://docs.docker.com/compose/)                                                                                             | Se levanten servicios locales o despliegues del servidor.            |
| OpenAPI        | [Specification](https://spec.openapis.org/oas/latest.html)                                                                           | Se modifique un contrato REST o generación de clientes.              |

## Fuentes oficiales: IA y web futura

| Tecnología       | Documentación                                                       | Usar cuando                                                         |
| ---------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------- |
| AI SDK           | [Core](https://ai-sdk.dev/docs/ai-sdk-core)                         | Se implementen generación, streaming, tools o manejo de mensajes.   |
| AI SDK OpenAI    | [Provider](https://ai-sdk.dev/providers/ai-sdk-providers/openai)    | Se configure OpenAI mediante variables de entorno.                  |
| AI SDK Anthropic | [Provider](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic) | Se configure Claude mediante variables de entorno.                  |
| OpenAI API       | [API reference](https://platform.openai.com/docs/api-reference)     | Se revisen modelos, límites, autenticación o cambios del proveedor. |
| Anthropic API    | [API docs](https://docs.anthropic.com/en/api/getting-started)       | Se revisen capacidades, límites o autenticación de Claude.          |
| Next.js          | [Docs](https://nextjs.org/docs)                                     | Se trabaje en el repositorio web futuro.                            |
| HeroUI           | [Docs](https://www.heroui.com/docs)                                 | Se usen componentes de la web administrativa o pública.             |
| Tailwind CSS     | [Docs](https://tailwindcss.com/docs)                                | Se trabaje en la web; no introducirlo en el cliente móvil.          |

## Regla de sincronización

Cuando cambie el comportamiento, actualizar la especificación y arquitectura afectadas en la
misma unidad de trabajo. Las fuentes externas explican APIs; los documentos internos definen
las decisiones, límites y políticas de Turismo Vinculación.
