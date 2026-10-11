# Rendimiento

## Principio

Medir antes de optimizar. Guardar baseline, volumen, dispositivo y resultado.

## Presupuestos iniciales

- API pública p95 sin proveedor externo: objetivo < 400 ms en entorno de referencia.
- Endpoint de viewport: respuesta limitada y cancelable; nunca devolver fichas completas.
- Primera pantalla móvil: útil antes de cargar multimedia secundaria.
- Imágenes: tamaños derivados y formatos modernos; video por streaming.
- Jobs: métricas de espera, ejecución, reintentos y fallos.

Estos objetivos se revisan con mediciones reales, no se convierten en promesas contractuales.

## Antipatrones

- Consultar ficha completa por cada marcador.
- N+1 de relaciones extensas.
- Cargar originales para miniaturas.
- Cachear datos privados sin clave de usuario/permiso.
- Añadir Redis o pgvector sin un cuello medido.
- Mantener GPS de alta precisión fuera de una función activa.

## Controles móviles implementados

Búsqueda local con documentos e índice reutilizables, preparación inicial cooperativa,
listas virtualizadas y galerías/opiniones paginadas. Las lecturas nativas de catálogo offline
proyectan metadatos/centros; contenido completo bajo demanda con una entrada por ciudad.
El catálogo visual ordena solo ciudades descargables o conservadas con un comparador
español reutilizable y conserva sus grupos mientras no cambian los datos. Las ciudades
locales siguen visibles aunque falle la consulta remota.
El mapa muestra páginas sucesivas y conserva cancelación y cobertura. Las lecturas HTTP
tienen plazos por operación y las búsquedas inactivas retención breve. React Compiler y
clustering nativo se conservan; no se introduce otra tecnología de caché.

Las fotografías admiten variantes fijas en la API con recursos acotados. La mejora de bytes
requiere desplegar esa API; el móvil conserva compatibilidad con el servidor anterior.
Arquitectura en [mobile.md](../architecture/mobile.md) y
[backend.md](../architecture/backend.md#variantes-de-fotografías-públicas).

La [evidencia de implementación](../../openspec/changes/mejorar-rendimiento-movil/evidence.md)
separa benchmarks sintéticos en ordenador, compilación y comprobaciones pendientes en el
dispositivo. Las medianas de una función no expresan la mejora porcentual de toda la app.
