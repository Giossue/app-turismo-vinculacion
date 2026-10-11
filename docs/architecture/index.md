# Índice de arquitectura

## Orden de lectura

1. [Router documental](../README.md) para ubicar tarea y fuentes oficiales.
2. [Mapa del sistema](../../ARCHITECTURE.md), [stack](stack.md) y [bootstrap](bootstrap.md).
3. [Móvil](mobile.md), [web y panel externo](web.md) o [backend](backend.md).
4. [Autenticación](authentication.md), [acceso](../security/access-control.md) y [datos](database.md).
5. [Mapas y navegación](maps-navigation.md), [IA](ai.md) o [integraciones](integrations.md).
6. [Despliegue](deployment.md) y [parches nativos](native-patches.md) cuando corresponda.
7. [Adopción de CognitiveStack](cognitivestack-adoption.md) y [ADR 0005](adr/0005-cognitivestack-openspec.md).

## Diseño de superficies y operaciones

| Necesidad                                         | Fuente                                                              |
| ------------------------------------------------- | ------------------------------------------------------------------- |
| Usuario, objetivo, decisión y P0-P3               | [Brief cognitivo](cognitive-architecture.md)                        |
| Fronteras y propiedad del estado                  | [Frontend](frontend.md)                                             |
| Tokens y accesibilidad nativa                     | [Fundamentos](design-foundations.md)                                |
| Elegir y reutilizar controles                     | [Selección](component-selection.md), [sistema](component-system.md) |
| Mapa, sheets, chat y páginas                      | [Diseño de interfaz](interface-design.md)                           |
| Listas, paginación y selección                    | [Colecciones](data-tables.md)                                       |
| Campos, permisos y mutaciones                     | [Formularios y flujos](forms-and-workflows.md)                      |
| Carga, vacío, error, offline y resultados tardíos | [Feedback y estados](feedback-and-states.md)                        |
| Historial, overlays y tamaño de pantalla          | [Navegación adaptable](navigation-responsive.md)                    |
| Repetición, concurrencia y recuperación           | [Idempotencia](idempotency.md)                                      |

[Specs vigentes](../../openspec/specs/), [ciclo de cambios](../quality/change-lifecycle.md)
y [perfil OpenSpec](../quality/openspec-installation.md) completan estas fuentes.

## Reglas

- Registrar decisiones costosas o difíciles de revertir mediante ADR.
- Mantener límites comprobables; documentar qué comprobaciones se ejecutaron.
- Usar OpenAPI como contrato; no afirmar clientes generados sin comprobar su pipeline.
- Favorecer el monolito modular hasta que métricas demuestren otra necesidad.
- Consultar la documentación oficial enlazada por `docs/README.md` antes de implementar y
  volver a ella cuando una herramienta o integración falle.
