---
name: review-code
description: Revisa cambios de API y móvil por corrección, seguridad, integridad, regresiones, compatibilidad con el panel y coherencia del knowledge.
---

# Revisar código y fuentes

Leer el cambio, arquitectura y [guía](../../../docs/quality/code-review.md).
Inspeccionar diff y contexto, conservando cambios ajenos.

Priorizar exposición de borradores, identidad/propiedad, ubicación excesiva,
archivos, prompt injection, errores de transacción, reintentos ciegos, migraciones,
contratos rotos y estado privado entre cuentas. Verificar requisitos reales,
sin deducir implementación de una plantilla o un plan histórico.

Distinguir hallazgo confirmado, hipótesis y cobertura pendiente. Reportar archivo,
escenario, impacto y corrección concreta. Revisar la cobertura prevista sin ejecutar
tests si no se solicitaron. No reescribir expectativas para ocultar un defecto.
