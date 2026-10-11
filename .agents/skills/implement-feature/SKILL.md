---
name: implement-feature
description: Implementa cambios de Turismo Vinculación que cruzan API, móvil, contratos o datos, con el alcance y autorización solicitados.
---

# Implementar una feature

Leer [índice](../../../docs/README.md), producto, cambio OpenSpec y arquitectura
afectada. Identificar actor, propiedad, estado publicado/privado, ubicación,
offline, integraciones y datos que necesitan migración.

Usar propuesta, diseño, escenarios y tareas para comportamiento no trivial;
respetar autorización existente sin agregar aprobaciones rutinarias. Implementar
una unidad coherente y coordinar el panel separado cuando cambia su API.

Conservar Nest/Fastify/SQL y Expo/Paper/MapLibre. Autorizar registros y referencias,
validar límites, mantener transacciones y compatibilidad de consumidores.
No inventar tenants, jobs o módulos por aparecer en una hoja de ruta.

Actualizar contratos, docs y deltas. Añadir/ejecutar tests cuando se solicite y
reportar evidencia real y pendientes. No ampliar a módulos adyacentes ni publicar
sin la solicitud correspondiente.
