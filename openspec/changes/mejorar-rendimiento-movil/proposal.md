# Proposal

## Why

El turista pierde fluidez al buscar entre muchos lugares descargados: la función actual recorre y normaliza todo el contenido por consulta y la interfaz monta todas las coincidencias. También se retienen búsquedas transitorias durante 24 horas, las consultas no tienen un plazo propio y el mapa espera todas sus páginas antes de mostrar atractivos.

La revisión previa midió en Node, con datos sintéticos, medianas de 1,86/24,32/86,44 ms para 500/5.000/20.000 lugares. La muestra pasiva del Motorola Edge 50 Fusion registró 9/750 fotogramas lentos; no demuestra rendimiento del mapa completo ni de los escenarios sintéticos.

## What Changes

- Preparar un índice de búsqueda local reutilizable, conservando coincidencias, sinónimos, aproximaciones, orden y cobertura.
- Virtualizar resultados, guardados y catálogo de ciudades; limitar las filas simultáneas de opiniones y fotos mediante páginas accesibles.
- Consultar metadatos offline ligeros y cargar manifiestos completos solo para búsqueda o mapa offline; localizar fichas sin hidratar todas las rutas y estilos.
- Acotar transporte y lectura JSON por operación, conservando cancelación, sesión y fallback local.
- Retener búsquedas inactivas pocos minutos y mostrar páginas del mapa progresivamente sin recortar destinos.
- Servir miniaturas y vistas previas públicas de tamaño fijo y con recursos acotados; el móvil mantiene compatibilidad con la API anterior.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `public-tourism-discovery`: consultas acotadas, memoria transitoria y mapa progresivo.
- `offline-city-content`: índice reutilizable y consultas locales ligeras sin perder paquetes existentes.
- `favorites-and-opinions`: listas y páginas con cantidad acotada de elementos montados.
- `multimedia-access`: variantes públicas de fotografías y galerías paginadas.

## Impact

Móvil Expo/React Native y módulo `files` de la API NestJS. Sin nuevas dependencias ni migraciones PostgreSQL. Las miniaturas requieren desplegar la API; la consulta opcional conserva la respuesta original con servidores anteriores. Se preservan los cambios de caché ya existentes, las descargas, las reglas de publicación, SecureStore y los permisos de ubicación. El usuario solicitó posteriormente push y actualización del Android conectado. La comprobación física detectó que R8 retiraba el cargador de tareas de Expo; se conserva esa clase mediante la configuración nativa existente. No se solicitó un despliegue de la API ni una migración.
