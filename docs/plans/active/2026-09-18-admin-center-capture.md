# Implementación activa: captura y publicación de fichas administrativas

## Objetivo

Entregar el primer corte vertical del panel administrativo: crear/editar el núcleo de
una ficha, conservar borradores separados del contenido publicado y completar el flujo
`BORRADOR -> EN_REVISION -> APROBADO -> PUBLICADO`, con auditoría y autorización del
rol `ADMINISTRADOR`.

## Alcance implementado

- Migración para snapshots de borrador y control optimista de versiones.
- API administrativa para catálogo, detalle, creación, edición, envío a revisión,
  aprobación, rechazo, publicación, desactivación y auditoría.
- Panel web con formulario de núcleo, detalle de ficha y acciones de estado.
- Catálogos y captura de actividades, condiciones de accesibilidad y facilidades.
- Aplicación transaccional de esas relaciones al publicar, conservando el borrador aislado.
- Gestión administrativa de nombre y disponibilidad de catálogos técnicos, con auditoría
  inmutable de cada cambio.
- Carga de fotografías desde el panel, validación de contenido, metadatos, estado
  pendiente/publicado, eliminación lógica y exposición pública únicamente después de publicar.
- Pruebas unitarias/API y verificaciones de build, tipos y formato.

Las importaciones, documentos y procesamiento avanzado (miniaturas/transcodificación) quedan
registrados como fases posteriores; no se altera la versión pública mientras una ficha tenga
cambios pendientes.

## Reglas

- Solo `ADMINISTRADOR` puede consultar o mutar la superficie administrativa.
- La web nunca se conecta directamente a PostgreSQL.
- La ficha pública solo lee centros `PUBLICADO` y activos.
- La publicación y su auditoría ocurren dentro de una transacción.
- Los códigos públicos los deriva el trigger de PostgreSQL; el cliente no los inventa.
- Los binarios no se guardan en PostgreSQL: el proveedor local/S3 conserva el objeto y la
  base solo guarda metadatos y una clave generada por el servidor.
- Una foto subida queda `PENDIENTE`; solo el flujo de publicación la vuelve visible al turista.

## Verificación

- Tests de servicio para transiciones, aislamiento del borrador y autorización negativa.
- Migración ejecutable sobre base vacía y base existente.
- `pnpm --filter @turismo/api` y `bun run verify` en el panel.

## Estado

Implementado el núcleo y la primera fase técnica: migraciones de borradores, catálogos,
auditoría y archivos, API administrativa, formulario web del núcleo, actividades,
accesibilidad, facilidades, gestión de disponibilidad y multimedia (fotos, video y audio),
flujo de revisión/publicación y exposición de fotos publicadas al móvil. Importaciones,
documentos y procesamiento multimedia avanzado permanecen abiertos.
