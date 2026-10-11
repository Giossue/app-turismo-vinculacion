---
name: update-documentation
description: Actualiza el knowledge de API y móvil al cambiar contratos, comportamiento, arquitectura, seguridad o calidad, manteniendo procedencia y fuentes únicas.
---

# Actualizar fuentes

Leer [índice](../../../docs/README.md) y la fuente afectada. Producto/vocabulario
en docs/product; decisiones/patrones en arquitectura; controles en seguridad;
evidencia en calidad; comportamiento en specs y deltas OpenSpec.

Distinguir actual, requerido y pendiente. Código es evidencia de implementación,
no de despliegue. Conservar feature docs y ADRs anteriores sin declarar pendientes
resueltos. La planificación vive exclusivamente en OpenSpec; los antecedentes
retirados se consultan en Git. Enlazar fuentes y corregir referencias al mover contenido.

Conservar stack, parches nativos y límites de repositorio. Las versiones se
contrastan con manifiestos/lockfile. El panel tiene sus propias fuentes MUI/Bun.

Regenerar OpenSpec con el wrapper fijado; no editar skills/comandos/prompts
generados. La documentación derivada se cambia en su generador.
Mantener AGENTS como routing e invariantes. Reportar revisión documental sin
atribuir resultados de tests o producción no ejecutados.
