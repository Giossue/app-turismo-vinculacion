import { ESTABLISHMENT_MAP_GROUPS } from "../../establishments/establishment-groups";
import type {
  OfflineCityManifest,
  OfflineGeoJson,
} from "../domain/offline-city";

/** A complete geographic snapshot, independent of viewport pagination/MVT. */
export function buildOfflineEstablishmentQuery(
  boundary: OfflineGeoJson | null,
  bounds: OfflineCityManifest["bounds"],
): Readonly<{ sql: string; params: unknown[] }> {
  const params: unknown[] = [boundary, ...bounds];
  const add = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };
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

  return {
    params,
    sql: `WITH area AS (
      SELECT COALESCE(
        ST_GeomFromGeoJSON($1::jsonb),
        ST_MakeEnvelope($2, $3, $4, $5, 4326)
      )::geography AS geometry
    )
    SELECT e.id::integer AS id,
           e.nombre_comercial AS name,
           COALESCE(activity_catalog.nombre, e.actividad) AS activity,
           COALESCE(classification_catalog.nombre, e.clasificacion) AS classification,
           COALESCE(category_catalog.nombre, e.categoria) AS category,
           CASE
             WHEN COALESCE(category_catalog.nombre, e.categoria) IS NULL THEN NULL
             ELSE CONCAT_WS(' · ',
               COALESCE(classification_catalog.nombre, e.clasificacion),
               COALESCE(category_catalog.nombre, e.categoria)
             )
           END AS "categoryLabel",
           e.direccion AS address, e.telefono AS phone,
           l.nombre AS "localityName",
           ST_Y(e.ubicacion::geometry) AS latitude,
           ST_X(e.ubicacion::geometry) AS longitude,
           e.coordenadas_aproximadas AS approximate,
           COALESCE(NULLIF(classification_catalog.icono, 'mapPin'), NULLIF(category_catalog.icono, 'mapPin'), 'shop-supermarket') AS icon,
           CASE ${groupCases.join(" ")} END AS "group"
      FROM establecimientos_turisticos e
      JOIN localidades l ON l.id = e.localidad_id
      JOIN cantones co ON co.id = l.canton_id
      JOIN provincias p ON p.id = co.provincia_id
      LEFT JOIN catalogo_catastro_actividades activity_catalog
        ON activity_catalog.id = e.actividad_catalogo_id
      LEFT JOIN catalogo_catastro_clasificaciones classification_catalog
        ON classification_catalog.id = e.clasificacion_catalogo_id
      LEFT JOIN catalogo_catastro_categorias category_catalog
        ON category_catalog.id = e.categoria_catalogo_id
      CROSS JOIN area
     WHERE e.activo = TRUE
       AND e.estado_revision = 'PUBLICADO'
       AND e.ubicacion IS NOT NULL
       AND l.activo AND co.activo AND p.activo
       AND ST_Covers(area.geometry, e.ubicacion)
     ORDER BY e.nombre_comercial, e.id`,
  };
}
