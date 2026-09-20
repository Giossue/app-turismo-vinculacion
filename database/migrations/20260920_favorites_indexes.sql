-- Favoritos ya forman parte del bootstrap inicial. Estos índices optimizan la
-- lectura ordenada por usuario sin cambiar la propiedad ni el contenido guardado.
CREATE INDEX IF NOT EXISTS idx_favoritos_centros_usuario_created
    ON favoritos_centros (usuario_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_favoritos_puntos_usuario_created
    ON favoritos_puntos_interes (usuario_id, created_at DESC, id DESC);
