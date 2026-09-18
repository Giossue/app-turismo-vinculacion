# Guía de agentes del proyecto

## Proyecto

`Turismo Vinculación App` es una plataforma turística para Ecuador. Empieza con
Guaranda, pero el dominio, la DPA y la arquitectura deben funcionar a escala nacional.

Stack aprobado:

- React Native, Expo y TypeScript para Android/iOS.
- MapLibre React Native para visualización nativa de mapas.
- Next.js y TypeScript para la web pública/administrativa futura, que se mantendrá en un
  repositorio separado del cliente móvil.
- NestJS con adaptador Fastify para la API REST.
- PostgreSQL, PostGIS y, cuando sea necesario, pgvector.
- Redis y BullMQ para caché, límites y trabajos persistentes.
- MinIO/S3 para fotografías, videos, audios y documentos.
- Docker Compose como base de operación en servidor propio.

## Leer antes de trabajar

- Índice de documentación y fuentes oficiales por tarea: `docs/README.md`
- Producto: `docs/product/overview.md`
- Módulos: `docs/product/modules.md`
- Decisiones abiertas: `docs/product/open-decisions.md`
- Dominio: `docs/product/domain-model.md`
- Arquitectura: `ARCHITECTURE.md`
- Stack: `docs/architecture/stack.md`
- Aplicación móvil: `docs/architecture/mobile.md`
- Backend: `docs/architecture/backend.md`
- Web: `docs/architecture/web.md`
- Base de datos: `docs/architecture/database.md`
- Mapas y navegación: `docs/architecture/maps-navigation.md`
- IA: `docs/architecture/ai.md`
- Definition of Done: `docs/quality/definition-of-done.md`
- Seguridad: `docs/security/principles.md`
- Privacidad y ubicación: `docs/security/privacy-location.md`

## Flujo obligatorio

1. Leer este archivo y el `AGENTS.md` más cercano al código afectado.
2. Consultar `docs/README.md`, abrir la documentación interna relacionada y la fuente oficial
   de cada tecnología/API que se vaya a usar antes de escribir código.
3. Si una herramienta, compilación, prueba o integración falla, volver primero a la sección
   oficial específica y a su troubleshooting; no corregir por intuición ni repetir intentos
   sin nueva evidencia.
4. Para trabajo no trivial, crear o actualizar un plan en `docs/plans/active/`.
5. Implementar la unidad coherente más pequeña.
6. Mantener sincronizados comportamiento, API, datos y documentación.
7. Ejecutar verificaciones proporcionales al cambio.
8. No declarar terminado mientras pruebas o documentación estén desalineadas.

### Verificación proporcional acordada

- Para cambios puramente visuales y de bajo riesgo —por ejemplo, iconos, colores,
  tipografía, espaciado o ajustes de composición— basta con aplicar el cambio y revisar
  que el diff sea correcto. No es obligatorio ejecutar TypeScript, lint, pruebas ni una
  captura manual del emulador o dispositivo.
- Ejecutar verificaciones automatizadas o visuales cuando el cambio afecte comportamiento,
  navegación, estado, MapLibre, APIs, base de datos, seguridad, dependencias nativas o
  cuando exista riesgo razonable de regresión.

## Comandos de referencia

Mientras no exista código, estos comandos son objetivos de bootstrap. Una vez creado el
monorepo, deben corresponder a scripts reales.

```bash
corepack pnpm install
corepack pnpm format
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm verify

corepack pnpm --filter @turismo/mobile lint
corepack pnpm --filter @turismo/mobile typecheck
corepack pnpm --filter @turismo/mobile test
```

## Restricciones permanentes

- Usar pnpm mediante Corepack en los proyectos JavaScript/TypeScript.
- Usar pnpm mediante Corepack también para Expo/React Native; no mezclar gestores.
- PostgreSQL/PostGIS es la fuente de verdad. Redis nunca almacena el único ejemplar de un dato.
- Toda modificación de esquema usa una migración versionada.
- Mantener secretos y claves de IA, correo, rutas, tiles privados y almacenamiento en el servidor.
- La aplicación móvil nunca se conecta directamente a PostgreSQL, Redis o MinIO.
- La IA consulta datos mediante herramientas controladas de la API y solo usa contenido aprobado/publicado.
- No enviar a la IA contraseñas, tokens, ubicación histórica ni datos personales innecesarios.
- Autorización por rol, acción y registro en el backend; ocultar un botón no constituye seguridad.
- Solicitar ubicación cuando la función la necesita, no durante el registro.
- Ubicación en segundo plano solo durante navegación activa, con consentimiento específico.
- Usar eliminación lógica para centros y usuarios; preservar auditoría e identificadores históricos.
- Archivos en MinIO/S3; en PostgreSQL solo metadatos y claves de objeto.
- No exponer IDs internos, buckets, rutas físicas, proveedores o detalles técnicos en la UI.
- No introducir microservicios: comenzar como monolito modular más trabajadores de cola.
- No añadir dependencias sin documentar propósito, mantenimiento, licencia y superficie de riesgo.
- No editar archivos generados manualmente.
- No hacer commit o push salvo solicitud explícita.

### Principio de UI móvil controlada por estado

La interfaz React Native es declarativa: cada overlay, ficha y pantalla debe tener una
fuente única de verdad en el estado (single source of truth). Las transiciones deben
actualizar ese estado y desmontar o cerrar explícitamente los overlays transitorios antes
de navegar; no se debe confiar en que una pantalla nueva o un re-render los oculte por
casualidad. En particular, una acción como “Cómo llegar” cierra la ficha del mapa y luego
abre la pantalla de ruta.

### Historial de navegación y botón Atrás

El historial de Expo Router contiene pantallas, no snapshots de la interfaz. Zoom, paneo,
scroll, filtros, texto escrito, selección de marcadores y apertura/cierre de overlays son
estado efímero y nunca deben crear entradas de navegación. El botón físico o gesto Atrás
de Android debe cerrar primero el overlay de la pantalla enfocada; si no hay uno, debe
retirar exactamente una pantalla y no deshacer el último gesto o cambio de estado.
Los destinos que funcionan como pestañas deben usar `replace`; solo las pantallas
secundarias reales, como una ficha o una ruta, deben usar `push`.

### Plataforma móvil y documentación oficial

- El móvil queda fijado a Expo `~57.0.23`, Expo Router `~57.0.21`, React Native `0.86.3`
  y React `19.2.3`. Expo SDK 57 debe mantenerse alineado con React Native 0.86; antes de
  actualizar una versión hay que comprobar la matriz oficial de compatibilidad.
- React Native Paper es el único kit externo de componentes del móvil. Los componentes
  `Tourism*` centralizan la identidad visual y `StyleSheet` se reserva para layout nativo;
  no introducir NativeWind, Tailwind ni otra librería visual utilitaria en este monorepo.
  La futura web tendrá su propio repositorio y decisiones de UI independientes.
- Las pantallas secundarias del móvil deben usar `TourismScreenFrame`, que centraliza safe
  area, encabezado, ancho máximo, márgenes y barra inferior cuando corresponda. `Explorar`
  mantiene un shell de mapa a pantalla completa y reutiliza los mismos tokens y navegación.
- Instalar paquetes Expo con `corepack pnpm expo install`; no elegir manualmente versiones
  que puedan quedar fuera del SDK fijado ni mezclar gestores de paquetes.
- Expo Router es la navegación file-based del móvil. Usar sus APIs (`useRouter`, `Link`,
  layouts y rutas) y no crear un `NavigationContainer` paralelo ni importar APIs de
  paquetes externos `@react-navigation/*` desde la aplicación.
- Los cambios nativos declarados en `app.json`/`app.config.*` o mediante config plugins
  (permisos, tareas de segundo plano, etc.) requieren regenerar y reconstruir el binario
  (prebuild/dev build); Fast Refresh no los aplica.
- Solicitar permisos justo cuando la función los necesita: ubicación foreground primero;
  segundo plano únicamente durante navegación activa, con consentimiento explícito y
  configuración nativa verificada.
- En React Native las dimensiones son puntos independientes de densidad, no píxeles
  físicos. Usar Flexbox, porcentajes y `useWindowDimensions`; respetar `fontScale` y una
  escala de tokens compartida para que la UI se adapte a pantallas y texto ampliado. Usar
  `PixelRatio` solo cuando una integración realmente requiera conocer densidad o escala.
- Centralizar estilos con `StyleSheet` y tokens. Los arrays `style` aplican el último estilo
  al final, por lo que las sobreescrituras deben ser intencionales. Como `Text` no hereda
  todos los estilos, usar componentes tipográficos compartidos en vez de tamaños aislados.
- Todo control táctil debe tener un objetivo de al menos 44dp, `hitSlop` cuando sea útil y
  feedback de plataforma configurado de forma intencional (por ejemplo, ripple en Android).
- El back handler de Android debe limpiar sus suscripciones: cerrar primero overlays,
  devolver `true` si el evento fue consumido y dejar que la navegación retire una sola
  pantalla cuando no lo fue. Un `Modal` abierto puede suprimir esos eventos.
- Los drawers modales del móvil deben usar `ReanimatedDrawerLayout` de
  `react-native-gesture-handler`, con panel, scrim y gesto en su progreso nativo compartido;
  no implementar un `Modal` con animaciones independientes. Las acciones que navegan esperan
  a `onDrawerClose` y el contenedor se envuelve en `GestureHandlerRootView`.
- Cada control no textual debe exponer `accessibilityLabel` y estado accesible; evitar
  elementos accesibles anidados y probar TalkBack y VoiceOver.

Fuentes oficiales fijadas: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/),
[Expo Location](https://docs.expo.dev/versions/v57.0.0/sdk/location/),
[Expo Router](https://docs.expo.dev/router/introduction/),
[React Native Style](https://reactnative.dev/docs/0.86/style),
[dimensiones](https://reactnative.dev/docs/0.86/height-and-width),
[useWindowDimensions](https://reactnative.dev/docs/0.86/usewindowdimensions),
[PixelRatio](https://reactnative.dev/docs/0.86/pixelratio),
[Text](https://reactnative.dev/docs/0.86/text),
[Pressable](https://reactnative.dev/docs/0.86/pressable),
[BackHandler](https://reactnative.dev/docs/0.86/backhandler) y
[accesibilidad](https://reactnative.dev/docs/0.86/accessibility).

## Definition of Done resumida

Una tarea termina cuando implementación, migraciones, pruebas, seguridad, accesibilidad,
observabilidad y documentación cuentan la misma historia.
