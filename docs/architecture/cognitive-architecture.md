# Diseñar desde la tarea

Antes de una pantalla o flujo no trivial, registrar en el diseño OpenSpec:

1. Quién lo usa y en qué contexto: turista, agente o administrador.
2. Qué objetivo intenta completar.
3. Qué decisión debe tomar.
4. Qué información mínima necesita para decidir.
5. Cuál es la acción principal y qué resultado espera.

En móvil, considerar una mano, luz exterior, conectividad, texto ampliado y
ubicación opcional. En operación, considerar repetición, estado de publicación
y permisos por registro. El brief no añade una aprobación a trabajo ya autorizado.

## Jerarquía P0–P3

| Nivel | Función                  | Ejemplo turístico                                        |
| ----- | ------------------------ | -------------------------------------------------------- |
| P0    | Orientación y acción     | Lugar seleccionado, estado y «Cómo llegar»               |
| P1    | Información para decidir | Accesibilidad, horario, origen y estimación disponible   |
| P2    | Detalle solicitado       | Servicios, fotografías y descripción completa            |
| P3    | Investigación técnica    | Historial operativo, payloads y diagnósticos autorizados |

El nivel pertenece a la tarea, no al campo. Una fecha puede ser esencial en
revisión y secundaria en una ficha. La UI turística no muestra detalles internos
para explicar su implementación. Revelar información de forma gradual y conservar
visibles los filtros activos, errores y consecuencias que cambian la decisión.

## Acciones y continuidad

Una superficie tiene una acción focal. Las secundarias frecuentes conservan
posición y las ocasionales se agrupan. El menú actual del móvil y el menú de fila
del panel se mantienen; adaptar docs no reordena controles existentes.

Al volver al mapa o a una lista, conservar el contexto que corresponda. Zoom,
scroll, filtros y overlays no crean pantallas en el historial. Nombrar registro y
consecuencia en una confirmación; ofrecer deshacer solo si existe operación real
de reversión.

Los objetivos de rapidez y carga visual se miden; no se declaran alcanzados por
usar esta plantilla. Fuentes: [frontend](frontend.md), [superficies](interface-design.md)
y [navegación](navigation-responsive.md).
