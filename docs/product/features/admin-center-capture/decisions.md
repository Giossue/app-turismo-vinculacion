# Decisiones

| Fecha | Decisión | Motivo |
| --- | --- | --- |
| 2026-09-18 | Usar `borradores_centros_turisticos` como snapshot JSONB versionado | Mantener publicación aislada sin duplicar todas las tablas normalizadas. |
| 2026-09-18 | Mantener el centro publicado activo mientras una edición está pendiente | Evitar que una corrección administrativa retire temporalmente el contenido turístico. |
| 2026-09-18 | Aplicar el snapshot normalizado únicamente al publicar | Garantizar una transacción única para datos, código y auditoría. |
| 2026-09-18 | Capturar actividades, accesibilidad y facilidades como relaciones normalizadas dentro del snapshot | El panel puede editar una propuesta completa sin exponer cambios hasta publicar; la API valida catálogos y categorías. |
| 2026-09-18 | Implementar multimedia de fotos, video y audio con almacenamiento local/S3 y publicación explícita | El backend valida MIME/firma, PostgreSQL conserva metadatos y el objeto solo se expone junto con una ficha publicada; documentos y procesamiento avanzado quedan fuera. |
