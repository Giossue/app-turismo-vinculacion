---
name: commit-changes
description: Prepara commits, push o PR de este monorepo cuando el usuario solicita entrega, preservando alcance, historial y cambios ajenos.
---

# Entregar trabajo solicitado

Leer [versionado](../../../docs/quality/version-control.md), diff y estado completos.
La solicitud fija si se hace commit, push o PR; una skill no añade autorización.

Seleccionar archivos del cambio coherente, conservar trabajo ajeno y revisar
lockfile, contratos, docs, generados y migraciones. No incluir credenciales,
ubicación privada, dumps o archivos temporales. Reportar comprobaciones reales,
sin correr tests salvo solicitud.

Usar mensaje claro y cuerpo que explique cambio y límites cuando sea necesario.
Antes de push, comprobar rama, upstream y destino. No forzar o reescribir historia
publicada sin solicitud específica. Una entrega multirrepo conserva sus commits
y contratos propios y se informa por repositorio.
