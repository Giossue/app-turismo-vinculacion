# Elegir componentes

| Necesidad                       | Opción de este proyecto                              |
| ------------------------------- | ---------------------------------------------------- |
| Pantalla secundaria             | `TourismScreenFrame`                                 |
| Mapa a pantalla completa        | Shell existente de Explorar o ruta                   |
| Detalle sin perder el mapa      | Sheet nativa y `TourismSheetHandle`                  |
| Control visual común            | Paper a través de componentes `Tourism*`             |
| Lista nativa extensa            | Colección virtualizada cuando el volumen lo requiere |
| Fecha en registro               | Calendario nativo existente                          |
| Error, vacío o carga            | Feedback compartido de `core/ui`                     |
| Preferencia que aplica al tocar | Switch actual de Configuración                       |
| CRUD administrativo             | Componentes MUI en el repositorio del panel          |

Comenzar por la intención y el contrato del control. Explicar si un cambio aplica
al tocar o al guardar. No sustituir un Switch existente por un patrón de plantilla
sin un cambio de comportamiento solicitado y especificado.

No instalar shadcn, Tailwind, TanStack Table ni otro kit para reproducir un ejemplo.
Si falta un componente, justificar su contrato, accesibilidad y estado en el diseño.
Referencias: [sistema de componentes](component-system.md) y [formularios](forms-and-workflows.md).
