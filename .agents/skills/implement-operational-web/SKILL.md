---
name: implement-operational-web
description: Coordina cambios de API y contratos del panel institucional separado cuando una tarea del monorepo afecta captura, revisión, catálogos o auditoría web.
---

# Coordinar con el panel

Leer [web](../../../docs/architecture/web.md), el contrato afectado y el cambio OpenSpec.
El panel actual está en web-turismo-admin, con Next/MUI y Bun. apps/web conserva
un scaffold público anterior; no contiene la operación institucional.

Definir compatibilidad, roles, propiedad, versiones y estados que consume la web.
Mantener autorización real y auditoría en la API. Las mutaciones del cliente no
sustituyen transacciones ni idempotencia del servidor.

Para implementar interfaz del panel, cargar sus AGENTS, docs y skill frontend
locales y respetar el alcance de repositorios autorizado. No instalar HeroUI,
Tailwind o componentes MUI dentro del monorepo como efecto de la coordinación.

Actualizar ambos contratos cuando corresponda y describir lo implementado,
pendiente y comprobado. Pruebas y entrega respetan la solicitud del usuario.
