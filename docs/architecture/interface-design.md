# Superficies desde la tarea

El [brief de pantalla](cognitive-architecture.md) precede a la elección de superficie.

| Tarea                              | Superficie actual o criterio de evolución          |
| ---------------------------------- | -------------------------------------------------- |
| Descubrir lugares                  | Mapa y búsqueda en Explorar                        |
| Consultar un lugar en contexto     | Sheet o ficha pública                              |
| Seguir una ruta                    | Shell de mapa y panel de ruta                      |
| Conversar con el agente            | Sheet de chat y detalles apilados                  |
| Gestionar perfil o ajustes         | Pantalla secundaria dentro de `TourismScreenFrame` |
| Comparar registros institucionales | Tabla en el panel separado                         |
| Completar una ficha extensa        | Asistente de apartados del panel                   |

Mostrar primero P0/P1, separar detalles y conservar la consecuencia de acciones
sensibles visible. Etiquetas y copy en español, usando vocabulario turístico.
El visitante no necesita nombres de tablas, buckets, IDs, SDKs o prompts para decidir.

La acción principal tiene objeto y resultado comprensibles. Mantener cancelación
real, foco cuando aplique, objetivos táctiles y lectura accesible. Volver desde un
detalle conserva la conversación o mapa pertinente; los gestos no crean historial.

No rediseñar las superficies actuales como efecto de instalar CognitiveStack.
Registrar una modificación funcional o visual cuando se solicite ese alcance.
