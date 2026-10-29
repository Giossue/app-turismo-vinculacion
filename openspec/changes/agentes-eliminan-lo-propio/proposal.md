# Proposal

## Why

Un `AGENTE_TURISTICO` captura y edita sus centros y catastros, pero no podía eliminarlos: `DELETE /admin/centers/:code` y `DELETE /admin/establishments/:id` eran solo de `ADMINISTRADOR`, y el panel ocultaba «Eliminar» a los agentes. Quien corrige un error propio dependía del administrador.

## What Changes

- Ambos DELETE aceptan `AGENTE_TURISTICO`. El servicio comprueba que `responsable_usuario_id` sea el usuario (si no, 404, igual que al leer o editar) y rechaza con 409 la eliminación mientras el registro está `EN_REVISION`.
- El administrador conserva el borrado de cualquier registro en cualquier estado.
- El borrado de centros es definitivo y arrastra su auditoría: la API registra en el log quién lo hizo.
- El panel muestra «Eliminar» al agente en «Mis centros turísticos» y «Mi catastro» solo para sus registros (`editable`) y fuera de revisión.
- Editar lo propio no cambia: sigue regido por el flujo editorial (borrador/rechazado; lo publicado depende del paso libre de catastros y, en centros, de la revisión).

## Capabilities

### Modified Capabilities

- `institutional-publication`: el agente elimina sus propios centros y catastros.

## Impact

API (`admin.controller`, `admin-centers.service`, `establishments.controller`/`service`) y panel web (`admin-shell`, `establishment-management`). Sin migraciones. Riesgo asumido: un agente puede borrar definitivamente un centro propio ya publicado, con sus opiniones y favoritos.
