# Principios de seguridad

- Denegar por defecto y autorizar cada acción/registro en backend.
- Minimizar datos personales, precisión, retención y acceso.
- Solicitar permisos en contexto y ofrecer alternativa funcional.
- Nunca incluir secretos en repositorio, clientes, logs ni mensajes.
- Validar toda frontera: HTTP, archivo, job, webhook, proveedor y configuración.
- Usar consultas parametrizadas y allowlists para filtros/orden.
- Separar contenido publicado, pendiente y privado.
- La captura administrativa admite `AGENTE_TURISTICO` sobre sus propios borradores y la
  revisión/publicación exige `ADMINISTRADOR`; la consulta pública solo devuelve catastros
  activos y publicados, omitiendo RUC, razón social, número de registro e identificadores
  internos.
- IA y archivos son entradas no confiables.
- Credenciales de producción con privilegio mínimo y rotación.
- Respaldos cifrados, acceso auditado y restauración probada.
- Dependencias revisadas por nombre, origen, mantenimiento, licencia y vulnerabilidades.
- Un borrado lógico no reemplaza políticas de privacidad y eliminación exigible.

Variables reales viven en un gestor de secretos o entorno seguro. `.env.example` contiene
solo nombres y valores ficticios.
