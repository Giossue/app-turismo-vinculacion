import type { EntityManager } from "typeorm";

export const ACCOUNT_DELETED_NAME = "Cuenta eliminada";

/**
 * `opinion_versiones_contenido_check` exige calificación o comentario: una versión
 * que solo tenía comentario conserva este texto neutro en vez de quedar vacía.
 */
export const ERASED_OPINION_COMMENT = "[comentario eliminado]";

/** No es un hash de Argon2: `PasswordService.verify` siempre lo rechaza. */
const UNUSABLE_PASSWORD_HASH = "!cuenta-eliminada";

/**
 * Clasificación de cada FK real hacia `usuarios`. La prueba de integración compara
 * esta lista con `information_schema`: una tabla nueva falla hasta clasificarse.
 */
export const USUARIOS_REFERENCES = {
  /** Se borran las filas; `itinerarios_usuario` y `conversaciones_ia` arrastran las suyas. */
  deleted: [
    "auth_sessions.usuario_id",
    "conversaciones_ia.usuario_id",
    "favoritos_centros.usuario_id",
    "favoritos_establecimientos.usuario_id",
    "favoritos_puntos_interes.usuario_id",
    "itinerarios_usuario.usuario_id",
    "preferencias_historial_ia.usuario_id",
  ],
  /** La fila queda, marcada y sin el texto de la persona. */
  anonymized: ["opiniones.usuario_id"],
  /** Constancia y rol: se conservan, sin dato personal adicional. */
  retained: ["aceptaciones_legales.usuario_id", "usuarios_roles.usuario_id"],
  /**
   * Autoría institucional. Una cuenta que solo es TURISTA no escribe en ellas; si
   * tuvo otro rol, la referencia sigue válida y apunta a la fila anonimizada.
   */
  institutional: [
    "archivos_centro_turistico.eliminado_por",
    "archivos_centro_turistico.subido_por",
    "archivos_establecimiento_turistico.eliminado_por",
    "archivos_establecimiento_turistico.subido_por",
    "auditoria_catalogos.usuario_id",
    "auditoria_fichas.usuario_id",
    "borradores_centros_turisticos.actualizado_por",
    "centros_turisticos.responsable_usuario_id",
    "configuracion_plataforma.actualizado_por",
    "establecimientos_turisticos.responsable_usuario_id",
    "establecimientos_turisticos.revisado_por",
    "establecimientos_turisticos.solicitado_por",
    "moderaciones_opinion.moderador_id",
    "revisiones_publicacion.revisado_por",
    "revisiones_publicacion.solicitado_por",
    "rutas_transporte_versiones.creado_por",
  ],
} as const;

/**
 * Se ejecuta antes de bloquear la cuenta: `refresh` bloquea la sesión y después
 * necesita la cuenta, y el orden inverso los dejaría esperándose mutuamente.
 */
export async function lockAccountSessions(
  manager: EntityManager,
  userId: number,
): Promise<void> {
  await manager.query(
    "SELECT id FROM auth_sessions WHERE usuario_id = $1 ORDER BY id FOR UPDATE",
    [userId],
  );
}

/** Debe ejecutarse dentro de la transacción que ya bloqueó la cuenta. */
export async function anonymizeAccount(
  manager: EntityManager,
  userId: number,
): Promise<void> {
  for (const reference of USUARIOS_REFERENCES.deleted) {
    // Identificadores constantes de la clasificación; solo el id es un parámetro.
    const [table, column] = reference.split(".") as [string, string];
    await manager.query(`DELETE FROM ${table} WHERE ${column} = $1`, [userId]);
  }

  // Versiones antes que la raíz, en el orden de bloqueo de la moderación.
  await manager.query(
    `UPDATE opinion_versiones v
        SET comentario = CASE WHEN v.calificacion IS NULL THEN $2 ELSE NULL END
       FROM opiniones o
      WHERE o.id = v.opinion_id AND o.usuario_id = $1`,
    [userId, ERASED_OPINION_COMMENT],
  );
  // El motivo es del moderador, pero puede citar el texto que se está borrando.
  await manager.query(
    `UPDATE moderaciones_opinion m
        SET motivo = NULL
       FROM opiniones o
      WHERE o.id = m.opinion_id AND o.usuario_id = $1`,
    [userId],
  );
  await manager.query(
    `UPDATE opiniones
        SET eliminado_at = COALESCE(eliminado_at, CURRENT_TIMESTAMP),
            updated_at = CURRENT_TIMESTAMP
      WHERE usuario_id = $1`,
    [userId],
  );

  // El UUID y no el id: una persona podría registrar antes el correo derivado de un id.
  await manager.query(
    `UPDATE usuarios
        SET nombre = $2,
            email = 'eliminada-' || gen_random_uuid() || '@cuenta-eliminada.invalid',
            genero = NULL,
            fecha_nac = NULL,
            password = $3,
            email_verified_at = NULL,
            remember_token = NULL,
            activo = FALSE,
            eliminado_at = CURRENT_TIMESTAMP
      WHERE id = $1`,
    [userId, ACCOUNT_DELETED_NAME, UNUSABLE_PASSWORD_HASH],
  );
}
