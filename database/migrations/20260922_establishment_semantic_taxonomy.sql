-- Separa el tipo de establecimiento de la escala/categoría del consolidado nacional.
-- Es aditiva e idempotente: conserva nombres, aliases, IDs y campos visuales heredados.

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

ALTER TABLE auditoria_catalogos
  DROP CONSTRAINT IF EXISTS auditoria_catalogos_catalogo_codigo_check;

ALTER TABLE auditoria_catalogos
  ADD CONSTRAINT auditoria_catalogos_catalogo_codigo_check
  CHECK (catalogo_codigo IN (
    'ACCESSIBILITY',
    'ACTIVITY',
    'FACILITY',
    'ESTABLISHMENT_CATEGORY',
    'ESTABLISHMENT_CLASSIFICATION',
    'ESTABLISHMENT'
  ));

ALTER TABLE catalogo_catastro_clasificaciones
  ADD COLUMN IF NOT EXISTS icono VARCHAR(40) NOT NULL DEFAULT 'store',
  ADD COLUMN IF NOT EXISTS color VARCHAR(7) NOT NULL DEFAULT '#c026d3';

ALTER TABLE catalogo_catastro_clasificaciones
  DROP CONSTRAINT IF EXISTS catalogo_catastro_clasificaciones_icono_check;

ALTER TABLE catalogo_catastro_clasificaciones
  ADD CONSTRAINT catalogo_catastro_clasificaciones_icono_check
  CHECK (icono IN ('hotel', 'restaurant', 'coffee', 'store', 'bus', 'ticket', 'briefcase'));

ALTER TABLE catalogo_catastro_clasificaciones
  DROP CONSTRAINT IF EXISTS catalogo_catastro_clasificaciones_color_check;

ALTER TABLE catalogo_catastro_clasificaciones
  ADD CONSTRAINT catalogo_catastro_clasificaciones_color_check
  CHECK (color IN (
    '#0891b2', '#7c3aed', '#c026d3', '#ea580c',
    '#d97706', '#dc2626', '#4f46e5'
  ));

ALTER TABLE catalogo_catastro_categorias
  ADD COLUMN IF NOT EXISTS esquema VARCHAR(30) NOT NULL DEFAULT 'OTRA',
  ADD COLUMN IF NOT EXISTS valor_numerico SMALLINT,
  ADD COLUMN IF NOT EXISTS requiere_revision BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE catalogo_catastro_categorias
  DROP CONSTRAINT IF EXISTS catalogo_catastro_categorias_esquema_check;

ALTER TABLE catalogo_catastro_categorias
  ADD CONSTRAINT catalogo_catastro_categorias_esquema_check
  CHECK (esquema IN (
    'ESTRELLAS',
    'TENEDORES',
    'TAZAS',
    'COPAS',
    'UNICA',
    'CATEGORIA_OFICIAL',
    'CLASE',
    'MODALIDAD',
    'OTRA'
  ));

ALTER TABLE catalogo_catastro_categorias
  DROP CONSTRAINT IF EXISTS catalogo_catastro_categorias_valor_numerico_check;

ALTER TABLE catalogo_catastro_categorias
  ADD CONSTRAINT catalogo_catastro_categorias_valor_numerico_check
  CHECK (valor_numerico IS NULL OR valor_numerico BETWEEN 1 AND 99);

WITH category_semantics AS (
  SELECT
    category.id,
    CASE
      WHEN category.nombre ~ '^[1-5] Estrellas?$' THEN 'ESTRELLAS'
      WHEN category.nombre ~ '^[1-5] Tenedores?$' THEN 'TENEDORES'
      WHEN category.nombre ~ '^[1-5] Tazas?$' THEN 'TAZAS'
      WHEN category.nombre ~ '^[1-5] Copas?$' THEN 'COPAS'
      WHEN LOWER(category.nombre) = 'categoría única' THEN 'UNICA'
      WHEN category.nombre IN ('Categoría Uno', 'Categoría Dos') THEN 'CATEGORIA_OFICIAL'
      WHEN category.nombre IN (
        'Primera', 'Segunda', 'Primera clase', 'Segunda clase',
        'Clase turista', 'Clase económica', 'Lujo'
      ) THEN 'CLASE'
      WHEN activity.nombre = 'TRANSPORTE TURÍSTICO' THEN 'MODALIDAD'
      ELSE 'OTRA'
    END AS esquema,
    CASE
      WHEN category.nombre ~ '^[1-5] (Estrellas?|Tenedores?|Tazas?|Copas?)$'
        THEN SUBSTRING(category.nombre FROM '^([1-5])')::SMALLINT
      ELSE NULL
    END AS valor_numerico,
    CASE
      WHEN category.nombre IN ('LANC_PASAJE', 'YATES_PASAJ', 'LAN_TOUR_DIARIO', 'MOTO_Velero')
        THEN TRUE
      WHEN activity.nombre = 'TRANSPORTE TURÍSTICO'
        AND category.nombre NOT IN ('Primera', 'Segunda', 'Primera clase', 'Segunda clase')
        THEN TRUE
      WHEN category.nombre IN ('Uno', 'Dos')
        THEN TRUE
      ELSE FALSE
    END AS requiere_revision
  FROM catalogo_catastro_categorias category
  JOIN catalogo_catastro_clasificaciones classification
    ON classification.id = category.clasificacion_id
  JOIN catalogo_catastro_actividades activity
    ON activity.id = classification.actividad_id
)
UPDATE catalogo_catastro_categorias category
   SET esquema = semantics.esquema,
       valor_numerico = semantics.valor_numerico,
       requiere_revision = semantics.requiere_revision
  FROM category_semantics semantics
 WHERE category.id = semantics.id;

WITH classification_visuals AS (
  SELECT
    classification.id,
    CASE
      WHEN activity.nombre = 'ALOJAMIENTO' THEN 'hotel'
      WHEN classification.nombre = 'RESTAURANTE' THEN 'restaurant'
      WHEN classification.nombre = 'CAFETERÍA' THEN 'coffee'
      WHEN classification.nombre IN ('BAR', 'DISCOTECA') THEN 'coffee'
      WHEN activity.nombre = 'TRANSPORTE TURÍSTICO' THEN 'bus'
      WHEN activity.nombre = 'AGENCIAMIENTO TURÍSTICO' THEN 'briefcase'
      WHEN activity.nombre IN (
        'GUIANZA TURÍSTICA',
        'ORGANIZADORES DE EVENTOS, CONGRESOS Y CONVENCIONES',
        'PARQUES DE ATRACCIONES ESTABLES'
      ) THEN 'ticket'
      ELSE 'store'
    END AS icono,
    CASE
      WHEN activity.nombre = 'ALOJAMIENTO' THEN '#7c3aed'
      WHEN classification.nombre = 'RESTAURANTE' THEN '#ea580c'
      WHEN classification.nombre = 'CAFETERÍA' THEN '#d97706'
      WHEN classification.nombre IN ('BAR', 'DISCOTECA') THEN '#c026d3'
      WHEN activity.nombre = 'GUIANZA TURÍSTICA' THEN '#dc2626'
      WHEN activity.nombre = 'TRANSPORTE TURÍSTICO' THEN '#0891b2'
      WHEN activity.nombre = 'AGENCIAMIENTO TURÍSTICO' THEN '#0891b2'
      WHEN activity.nombre = 'ORGANIZADORES DE EVENTOS, CONGRESOS Y CONVENCIONES'
        THEN '#4f46e5'
      WHEN activity.nombre = 'PARQUES DE ATRACCIONES ESTABLES' THEN '#dc2626'
      ELSE '#c026d3'
    END AS color
  FROM catalogo_catastro_clasificaciones classification
  JOIN catalogo_catastro_actividades activity
    ON activity.id = classification.actividad_id
)
UPDATE catalogo_catastro_clasificaciones classification
   SET icono = visuals.icono,
       color = visuals.color
  FROM classification_visuals visuals
 WHERE classification.id = visuals.id;

-- Los campos antiguos se conservan para compatibilidad con despliegues anteriores.
-- La API nueva lee el perfil visual de la clasificación.
UPDATE catalogo_catastro_categorias category
   SET icono = classification.icono,
       color = classification.color
  FROM catalogo_catastro_clasificaciones classification
 WHERE classification.id = category.clasificacion_id;

CREATE INDEX IF NOT EXISTS idx_catastro_categorias_esquema_revision
  ON catalogo_catastro_categorias (esquema, requiere_revision, activo);

COMMENT ON COLUMN catalogo_catastro_categorias.esquema IS
  'Sistema semántico de la categoría: estrellas, tenedores, tazas, copas, clase o modalidad.';
COMMENT ON COLUMN catalogo_catastro_categorias.valor_numerico IS
  'Valor numérico de la categoría cuando el sistema lo permite.';
COMMENT ON COLUMN catalogo_catastro_categorias.requiere_revision IS
  'Indica que el valor fuente no pudo interpretarse con suficiente certeza.';
COMMENT ON COLUMN catalogo_catastro_clasificaciones.icono IS
  'Código visual del tipo de establecimiento, compartido por sus categorías.';
COMMENT ON COLUMN catalogo_catastro_clasificaciones.color IS
  'Color hexadecimal del tipo de establecimiento en el mapa público.';

COMMIT;
