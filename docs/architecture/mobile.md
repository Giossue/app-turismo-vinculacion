# Arquitectura móvil

## Alcance

Una aplicación React Native/Expo para turistas y captura de campo de guías. Las capacidades se
habilitan por rol; no se duplican aplicaciones hasta que producto lo justifique.

## Organización por feature

```text
app/                 # Expo Router
src/
  core/
    api/ auth/ location/ storage/ telemetry/ ui/
  features/
    map/ discovery/ centers/ pois/ establishments/
    navigation/ transport/ favorites/ itineraries/ ai/
    field_capture/ profile/
```

Cada feature separa `domain`, `application`, `data` y `presentation` cuando la complejidad
lo amerita. Evitar capas ceremoniales para componentes triviales.

La navegación turística está organizada alrededor del mapa: `Explorar` muestra MapLibre y
una ficha rápida nativa; `Agente` y `Itinerario` son vistas secundarias con la misma barra
inferior; `Cómo llegar` representa la ruta activa sin solicitar GPS en la vista previa.
Los datos de ejemplo se identifican visualmente como demostración y se sustituyen por
consultas de la API cuando esos módulos se conecten.

## Estado

- TanStack Query: estado remoto, cancelación y caché explícita.
- Zustand: sesión, dependencias de UI y estado local de feature.
- Expo SecureStore: refresh token y material sensible mínimo.
- SQLite/AsyncStorage: catálogos descargados, favoritos sincronizables y borradores solo
  cuando se especifique su política de retención.
- Nunca guardar claves maestras de proveedores.

## Ubicación

- Explorar no requiere GPS.
- Solicitar `while in use` al pulsar “mi ubicación”, cercanía o iniciar ruta.
- Solicitar segundo plano solo al activar navegación y explicar el beneficio.
- Detener seguimiento al terminar/cancelar la ruta.
- No conservar trazas precisas por defecto.
- Permitir origen manual cuando el permiso se niega.

## Estados obligatorios

Permiso no solicitado, concedido aproximado, concedido preciso, denegado, denegado
permanentemente, GPS apagado, señal degradada y ubicación antigua.

## Captura de guías

- Borrador local recuperable.
- Guardado incremental en servidor.
- Cola de subidas con reintento.
- Compresión de multimedia sin perder original cuando la política lo exija.
- Conflictos visibles; nunca sobrescribir silenciosamente cambios revisados.

## Accesibilidad

Soportar escalado de texto, lectores de pantalla, contraste, objetivos táctiles y
subtítulos. No depender solo de color o gestos ocultos.
