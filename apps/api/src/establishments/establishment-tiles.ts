import { ESTABLISHMENT_MAP_GROUPS } from "./establishment-groups";

/**
 * Teselas vectoriales (MVT) de los catastros publicados, al estilo de los
 * mapas comerciales: el móvil pide cuadrados z/x/y, los guarda en caché y solo
 * descarga los que entran en pantalla.
 *
 * - Desde `ESTABLISHMENT_TILE_DETAIL_ZOOM` cada catastro es un punto con los
 *   datos que necesita la ficha.
 * - Por debajo se agregan por celda (`count`), así una tesela alejada pesa lo
 *   mismo con 76 que con 100.000 registros.
 *
 * Cada punto lleva su `group` (ver `ESTABLISHMENT_MAP_GROUPS`) para que el
 * móvil filtre con los chips sin volver a pedir teselas.
 */
export const ESTABLISHMENT_TILE_LAYER = "establishments";
export const ESTABLISHMENT_TILE_DETAIL_ZOOM = 13;
export const ESTABLISHMENT_TILE_MAX_ZOOM = 22;

const tileExtent = 4096;
const tileBuffer = 64;
/** Celdas por lado de la tesela al agregar: una por cada 64 px. */
const aggregateCellsPerSide = 64;

export type EstablishmentTileCoordinates = Readonly<{
  z: number;
  x: number;
  y: number;
}>;

export function isValidTile({ z, x, y }: EstablishmentTileCoordinates) {
  const tilesPerSide = 2 ** z;
  return x < tilesPerSide && y < tilesPerSide;
}

export function buildEstablishmentTileQuery({
  z,
  x,
  y,
}: EstablishmentTileCoordinates): Readonly<{ sql: string; params: unknown[] }> {
  const params: unknown[] = [z, x, y];
  const add = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };
  // Misma expresión que el índice idx_establecimientos_ubicacion_mercator.
  const mercator = "ST_Transform(e.ubicacion::geometry, 3857)";
  const groupCases = Object.entries(ESTABLISHMENT_MAP_GROUPS).map(
    ([key, group]: [
      string,
      Readonly<{
        activities?: readonly string[];
        classifications?: readonly string[];
      }>,
    ]) => {
      const matches: string[] = [];
      if (group.activities) {
        matches.push(`activity_catalog.nombre = ANY(${add(group.activities)})`);
      }
      if (group.classifications) {
        matches.push(
          `classification_catalog.nombre = ANY(${add(group.classifications)})`,
        );
      }
      return `WHEN ${matches.join(" OR ")} THEN ${add(key)}`;
    },
  );
  const points = `
    SELECT ${mercator} AS location,
           e.nombre_comercial AS name,
           COALESCE(category_catalog.nombre, e.categoria) AS category,
           CASE
             WHEN COALESCE(category_catalog.nombre, e.categoria) IS NULL THEN NULL
             ELSE CONCAT_WS(' · ',
               COALESCE(classification_catalog.nombre, e.clasificacion),
               COALESCE(category_catalog.nombre, e.categoria)
             )
           END AS "categoryLabel",
           ST_Y(e.ubicacion::geometry) AS latitude,
           ST_X(e.ubicacion::geometry) AS longitude,
           e.coordenadas_aproximadas AS approximate,
           COALESCE(NULLIF(classification_catalog.icono, 'mapPin'), NULLIF(category_catalog.icono, 'mapPin'), 'shop-supermarket') AS icon,
           CASE ${groupCases.join(" ")} END AS "group"
      FROM establecimientos_turisticos e
      LEFT JOIN catalogo_catastro_actividades activity_catalog
        ON activity_catalog.id = e.actividad_catalogo_id
      LEFT JOIN catalogo_catastro_clasificaciones classification_catalog
        ON classification_catalog.id = e.clasificacion_catalogo_id
      LEFT JOIN catalogo_catastro_categorias category_catalog
        ON category_catalog.id = e.categoria_catalogo_id
      , tile
     WHERE e.activo = TRUE
       AND e.estado_revision = 'PUBLICADO'
       AND e.ubicacion IS NOT NULL
       AND ${mercator} && tile.buffered`;
  const features =
    z >= ESTABLISHMENT_TILE_DETAIL_ZOOM
      ? `SELECT ST_AsMVTGeom(location, tile.envelope, ${tileExtent}, ${tileBuffer}, true) AS geom,
                name, category, "categoryLabel", latitude, longitude, approximate, icon, "group"
           FROM points, tile`
      : `SELECT ST_AsMVTGeom(ST_Centroid(ST_Collect(location)), tile.envelope, ${tileExtent}, ${tileBuffer}, true) AS geom,
                icon, "group", COUNT(*)::integer AS count
           FROM points, tile
          GROUP BY ST_SnapToGrid(location, (ST_XMax(tile.envelope) - ST_XMin(tile.envelope)) / ${aggregateCellsPerSide}),
                   icon, "group", tile.envelope`;
  const sql = `
    WITH tile AS (
      SELECT ST_TileEnvelope($1, $2, $3) AS envelope,
             ST_TileEnvelope($1, $2, $3, margin => ${tileBuffer / tileExtent}) AS buffered
    ),
    points AS (${points}),
    features AS (${features})
    SELECT COALESCE(ST_AsMVT(features, '${ESTABLISHMENT_TILE_LAYER}', ${tileExtent}, 'geom'), ''::bytea) AS tile
      FROM features`;
  return { sql, params };
}
