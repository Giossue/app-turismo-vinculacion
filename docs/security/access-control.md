# Identidad, rol y registro

| Pregunta                | Frontera local                                            |
| ----------------------- | --------------------------------------------------------- |
| ¿Quién solicita?        | JWT y sesiones en `apps/api/src/auth/`                    |
| ¿Qué puede hacer?       | Guards y reglas del caso de uso                           |
| ¿Sobre qué registro?    | Propiedad, estado y consultas autorizadas de la operación |
| ¿Qué se puede publicar? | Snapshot revisado y reglas editoriales de la API          |

El móvil y el panel reflejan permisos. Los roles no se aceptan desde el body.
Un ID, código, slug o referencia opaca de IA no autoriza nada. Comprobar todos los
IDs relacionados, lecturas, escrituras, media, exportaciones e historia privada.

El agente institucional captura, edita y elimina sus fichas y catastros (solo los que él
creó, comprobado con `responsable_usuario_id`; la ficha ajena responde 404 y durante la
revisión no se puede eliminar); el administrador decide revisión/publicación y catálogo global. La consulta pública excluye borradores,
datos privados y registros fuera de sus reglas de visibilidad.

Los guards existentes son propios de Nest y verifican JWT con `jose`; no se usa
Better Auth ni Passport. Mantener DTOs con campos permitidos, validación y SQL
parametrizado. El contexto del caso de uso procede de identidad autenticada.

## Tenants y evolución

Este producto no tiene un contrato de tenants. No dar por existente aislamiento
entre organizaciones, RLS ni memberships del kit de referencia. Si se incorpora,
especificar ámbito, constraints, consultas y pruebas correspondientes en la API.

## Respuestas y clientes

Minimizar errores y datos públicos. Autorizar archivos antes de leerlos o generar
URLs; un objeto opaco sigue necesitando permisos. Limpiar estado privado al cambiar
cuenta y conservar tokens de cliente en los lugares documentados.

La adopción no certifica todos los endpoints ni el despliegue. Para una auditoría,
documentar escenario, evidencia y cobertura real de cada frontera.
