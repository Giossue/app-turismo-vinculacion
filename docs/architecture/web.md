# Arquitectura web

## Áreas

- Pública: mapa básico, búsqueda, fichas, catastro y enlaces compartibles.
- Cuenta turística: favoritos e itinerarios con funciones limitadas.
- Operativa: captura, revisión, catálogos, transporte, moderación y auditoría.

## Stack

Next.js App Router, TypeScript estricto, HeroUI React, Tailwind, TanStack Query, React
Hook Form y Zod. Server Components para contenido público/SEO; Client Components solo
cuando existe interacción real.

## Estado

- URL: filtros, búsqueda, página, orden y zona del mapa cuando sea compartible.
- TanStack Query: datos del servidor e invalidación.
- React Hook Form: estado de formularios.
- Estado local: diálogos, menús y selecciones temporales.

## Interfaz operativa

- Navegación visible de máximo dos niveles.
- Formularios breves en diálogo; ficha de 14 secciones en páginas con progreso y guardado.
- Tablas con filtros consistentes, paginación y acciones por permisos/estado.
- Comparación clara entre publicado y propuesto durante revisión.
- Toda mutación comunica pendiente, éxito y error.
- Desactivar es reversible y no requiere fricción destructiva excesiva.
- No mostrar nombres de tablas, IDs, JSON, rutas de objeto o proveedor salvo herramienta técnica autorizada.

## Web móvil

La web pública debe funcionar en teléfono. El panel administrativo es responsive, pero
la captura de campo con GPS/cámara se optimiza en React Native.
