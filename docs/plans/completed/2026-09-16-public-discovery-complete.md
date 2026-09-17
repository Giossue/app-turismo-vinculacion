# Descubrimiento público completo

## Objetivo

Completar el primer bloque del roadmap: ficha pública práctica, filtros esenciales,
mapa por viewport y sus clientes móvil/web, sin iniciar módulos adyacentes.

## Límites

- Solo lectura de centros publicados y activos.
- Sin GPS, cuentas, multimedia, POIs, catastro, favoritos ni rutas.
- El mapa de desarrollo conserva el estilo público actual; MapTiler se configura en el
  bloque de operación de producción.

## Verificación

- Pruebas de caso de uso/contrato y validación de consultas.
- Lint, tipos, pruebas y build de los tres clientes.
- Smoke local de API y Development Build Android cuando el emulador esté disponible.

## Estado

Completado el 2026-09-16.

## Avance

- Implementados contrato público ampliado, catálogo de filtros, ficha práctica y filtros
  de texto/clasificación/DPA/jerarquía en API, móvil y búsqueda básica web.
- Verificados los endpoints contra PostgreSQL/PostGIS local y `pnpm verify`.
- El mapa consulta por viewport al terminar un desplazamiento/zoom y agrupa marcadores
  cercanos localmente según el zoom; la consulta inválida de viewport tiene prueba.
