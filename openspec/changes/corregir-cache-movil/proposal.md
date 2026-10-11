# Proposal

## Why

El turista puede seguir viendo datos vencidos al volver a la app o recuperar la conexión: TanStack Query no recibe los eventos nativos. Además, una renovación, mutación o escritura persistida pendiente puede restaurar información privada después de cerrar sesión o cambiar de cuenta.

## What Changes

- Conectar foco y conectividad nativos con las consultas, con limpieza de listeners y protección frente a lecturas iniciales tardías.
- Invalidar inmediatamente el acceso local al cerrar sesión o sustituirla, cancelar solicitudes anteriores y descartar sus respuestas y callbacks.
- Serializar las escrituras de sesión y de caché; impedir que una escritura pendiente reponga datos borrados.
- Mantener favoritos sin conexión para su propietario, el catálogo público y las descargas de ciudades; aplicar las 24 horas también a cada entrada persistida.
- Conservar el arranque desde las descargas ante consultas pausadas y distinguir falta de red de carga en curso. Persistir la colección confirmada mientras un favorito es tentativo y evitar colas de envíos privados sin conexión.
- Añadir regresiones de concurrencia, documentación y evidencia de comprobación móvil.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `identity-and-record-access`: cierre local inmediato, renovación coordinada y rechazo de resultados de una sesión anterior.
- `favorites-and-opinions`: aislamiento de la caché privada y de los callbacks por cuenta y generación de sesión.
- `public-tourism-discovery`: revalidación nativa de consultas activas vencidas y vigencia de la caché pública persistida.

## Impact

Afecta `apps/mobile/src/core/api`, autenticación, favoritos, opiniones y el proveedor raíz. Se añade `expo-network` compatible con Expo SDK 57, lo que requiere reconstruir el binario nativo. Conserva los contratos y permisos de la API, SecureStore, AsyncStorage, SQLite y MapLibre. No requiere migraciones ni cambios de producción; los mapas descargados no dependen del vencimiento de la caché de consultas.
