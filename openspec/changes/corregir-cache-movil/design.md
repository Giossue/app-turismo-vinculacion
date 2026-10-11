# Design

## Context

Véase `proposal.md`. El proveedor raíz ya configura revalidación al reconectar, pero no comunica eventos nativos a TanStack Query. La sesión vive en un contexto React con referencias de token y promesa de renovación, sin generación de sesión. Los callbacks de guardados y opiniones usan el contexto que pueda existir al terminar. El persister actual difiere escrituras y su borrado no cancela esa cola; `maxAge` limita el snapshot, no la edad de cada consulta.

## Goals / Non-Goals

**Goals:** mantener las claves por propietario, el acceso sin conexión y los contratos móviles, haciendo comprobable el orden de cancelación, respuestas y almacenamiento.

**Non-Goals:** rediseñar pantallas, permisos GPS, API, caché de teselas, descargas MapLibre/SQLite, proveedor de identidad o infraestructura.

## Decisions

### Eventos nativos

Un adaptador con ciclo de vida en el proveedor comunica `AppState` y `expo-network` a los gestores de foco/red de TanStack. Se leen el estado inicial y el de red al volver al primer plano; números de secuencia impiden que una lectura anterior sobrescriba un evento nuevo. Los estados desconocidos no se interpretan como desconexión. La variante web conserva los listeners del navegador. Un polling global repetiría solicitudes sin observar el ciclo nativo y no resuelve el problema de raíz.

Fuentes: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [Network compatible ~57.0.2](https://docs.expo.dev/versions/latest/sdk/network/), [AppState RN 0.86](https://reactnative.dev/docs/0.86/appstate) y [TanStack Query para React Native](https://tanstack.com/query/latest/docs/framework/react/react-native). El catálogo local `expo/bundledNativeModules.json` confirma la versión de Network para el SDK instalado; la URL versionada de esa página no estuvo accesible.

### Arranque sin red y estados visibles

La detección nativa pausa las consultas remotas antes de ejecutarlas. Las consultas con fallback SQLite usan `offlineFirst` para poder alcanzar su copia local; las lecturas y operaciones puramente locales conservan `always`. El mapa también selecciona las descargas ante una consulta pausada. Su reintento periódico de una API caída solo se ejecuta con foco y red. Guardados, opiniones, fichas y nuevas rutas distinguen pausa de carga; conservan sus datos disponibles y ofrecen conexión/reintento cuando no hay copia. Guardar o enviar una opinión usa `always` para informar el fallo de transporte y evitar una cola que se ejecute al volver la red. Fuente: [modos de red de TanStack Query](https://tanstack.com/query/latest/docs/framework/react/guides/network-mode).

Brief de los estados afectados: usuario turista; objetivo consultar sus destinos o descargas sin esperar indefinidamente; decisión usar una copia disponible o reintentar al recuperar conexión; información mínima dato disponible y estado de conexión; acción principal reintentar mediante los componentes Tourism existentes. No cambia la estructura de las pantallas ni se solicita GPS.

### Sesión y respuestas

Un controlador de aplicación independiente de React conserva token, snapshot, generación y renovación compartida. El contexto publica un fetcher ligado a esa generación y una comprobación de vigencia para consultas/mutaciones. Salir o iniciar otra sesión cambia la generación, cancela solicitudes y retira datos privados inmediatamente; la revocación remota es de mejor esfuerzo y no bloquea ese cierre. Las respuestas tardías y los reintentos con credenciales nuevas se descartan. Renovar la misma cuenta conserva su caché; cambiar identidad o roles invalida la generación anterior.

Las operaciones de SecureStore se ordenan en una cola. Cada guardado comprueba la generación antes y después; un borrado queda detrás de una escritura ya iniciada y delante de las escrituras de la nueva sesión. Conservar únicamente un ID de usuario no protege frente a salir y volver a entrar con la misma cuenta.

Frontera sensible: actor turista/invitado; activos tokens, perfil, favoritos y opinión propia; autorización remota inalterada en la API; validación de respuestas existente; repetición de renovación coordinada y reintento limitado; concurrencia protegida por generación y cola; auditoría remota a cargo de la API. No se registran credenciales, colecciones ni ubicación.

### Caché privada y persistencia

Las consultas privadas pasan el `AbortSignal`. Los callbacks capturan propietario, generación y clave antes de esperar y comprueban su vigencia antes de escribir, revertir o invalidar. Las invalidaciones privadas usan la clave de la cuenta correspondiente. Las claves de mutación incluyen la generación para impedir que un render nuevo sustituya las opciones de una operación anterior; al cambiar de cuenta se retiran también sus entradas de la caché de mutaciones.

El persister mantiene una escritura pendiente cancelable y serializa operaciones de disco. Borrar incrementa su generación, descarta lo pendiente y espera detrás de lo que ya se estaba escribiendo. Se reescribe una copia filtrada de los datos públicos y, cuando corresponde, solo los favoritos del propietario activo. Restaurar espera la lectura y filtra claves permitidas, estado exitoso y edad individual; la sesión inicia su restauración después de hidratar la caché. Un simple `removeClient` no protege frente al throttle observado en la librería.

Antes de mostrar un favorito optimista se captura la colección confirmada, con su fecha original. Cada snapshot se sustituye por esa copia antes de encolarse. Cambios concurrentes comparten la misma base; si alguno falla, permanece protegida hasta una lectura autorizada de la colección. Un éxito de todas las escrituras libera la protección; una consulta eliminada retira también su suscripción. La protección pertenece al QueryClient y una finalización antigua no libera una consulta recreada. No se guarda una colección tentativa si todavía no existía una copia confirmada.

## Risks / Trade-offs

- [Nuevo módulo nativo] → usar la versión de Expo instalada y reconstruir el dev build antes de validar foco/red en dispositivo.
- [Fallo del almacenamiento] → mantener el cierre en memoria, propagar el fallo de limpieza local y documentar que no se certifica borrado físico si el sistema rechaza la operación.
- [Operación remota ya aceptada] → descartar su efecto local; la cancelación del cliente no promete deshacer una escritura de la API.
- [Caducidad individual más estricta] → filtrar cada entrada al leer y escribir, conservando snapshots `mobile-v3` compatibles para no perder favoritos vigentes al actualizar sin conexión; mantener los paquetes descargados fuera de esta caché.

## Migration Plan

Instalar Network con Expo/Corepack, ejecutar las comprobaciones móviles y validar los deltas. Entregar código, lockfile y fuentes documentales juntos. Regenerar/reconstruir el binario para incluir el módulo. No hay esquema ni orden de despliegue de API. Una reversión de Git exige otra compilación nativa; no altera los paquetes de ciudades existentes.
