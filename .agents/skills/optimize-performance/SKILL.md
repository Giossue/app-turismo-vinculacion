---
name: optimize-performance
description: Investiga lentitud de API, consultas espaciales, mapa, descarga o UI móvil usando mediciones y conservando límites de seguridad.
---

# Optimizar con evidencia

Leer [rendimiento](../../../docs/quality/performance.md), arquitectura afectada y síntoma.
Definir entorno, volumen, dispositivo y medida antes de proponer un cambio.

Buscar consultas N+1, trabajo por marcador, repeticiones de red, imágenes originales,
capas recreadas, GPS innecesario y cargas no acotadas. No añadir Redis/pgvector o
otra dependencia sin un cuello medido y un contrato de degradación.

Preservar permisos, publicación, datos offline y cancelación. Medir SQL en un
entorno autorizado; no ejecutar EXPLAIN ANALYZE contra producción por defecto.
Implementar alcance autorizado y actualizar diseño/docs.

Ejecutar tests cuando se solicite. Separar objetivos, mediciones reales y
estimaciones; no afirmar mejoras de Android/iOS sin evidencia de esa plataforma.
