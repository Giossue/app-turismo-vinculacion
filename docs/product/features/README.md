# Catálogo de funcionalidades

Estas carpetas conservan especificaciones y decisiones anteriores a OpenSpec.
Pueden combinar comportamiento existente y alcance futuro. Los cambios nuevos
se registran con [el ciclo OpenSpec](../../quality/change-lifecycle.md); al retomar
una feature, reconciliar sus criterios y enlazarlos sin duplicar fuentes vigentes.

## Módulos previstos

1. Identidad, perfil, roles y consentimientos.
2. Inicio y descubrimiento.
3. Mapa turístico.
4. Búsqueda y filtros.
5. Centros turísticos y ficha pública.
6. Puntos de interés.
7. Catastro de establecimientos.
8. Rutas y navegación.
9. Transporte, cooperativas, paradas y horarios.
10. Favoritos, colecciones e historial controlado.
11. Opiniones y moderación.
12. Asistente IA con fuentes.
13. Multimedia y audioguías.
14. Eventos, clima, alertas y notificaciones.
15. Captura de fichas por administradores.
16. Revisión y publicación.
17. Catálogos e importaciones.
18. Valoración, reportes y auditoría.

No implementar un módulo solo por aparecer aquí: definir alcance, dependencias y criterios
de aceptación primero.

La captura administrativa inicial está especificada en
`admin-center-capture/` y cubre el núcleo de ficha, borradores, revisión, publicación y
auditoría, además de multimedia básica (fotos, video y audio). Las secciones ya implementadas se contrastan con el código actual; esa hoja de
ruta histórica no debe reabrir trabajo completado ni certificar pendientes.

El alcance integral del asistente turístico se especifica en `tourism-agent/`.
