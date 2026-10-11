# Componentes y utilidades compartidas

La base móvil está en `apps/mobile/src/core/ui/`: tokens, tema, proveedor Paper,
pantalla, controles, botones, campos, estado, Snackbar, sheets y asas.
Los módulos de geografía y formato evitan recalcular o representar coordenadas,
distancias y tiempos de maneras distintas.

Reutilizar `core/api/http.ts`, `query-keys.ts` y los módulos de cada feature.
Las tarjetas de lugares, el mapa y el chat tienen contratos distintos; no crear
un componente universal que mezcle identidad, búsqueda y navegación.

Una abstracción nueva se justifica por repetición real y debe declarar estado,
eventos, accesibilidad, cancelación y errores. Los tokens viven en un único lugar,
y las transiciones desmontan explícitamente los overlays que dejan de estar activos.

No existe un wrapper universal de todas las mutaciones o un PermissionGate que
autorice datos. La API decide acceso. Los componentes del panel se consultan y
modifican en `web-turismo-admin`, con su propio knowledge.

Inventario detallado: sección «Módulos compartidos» de [mobile.md](mobile.md).
