/**
 * Forma pública de un establecimiento del catastro, compartida por la búsqueda
 * cercana, la ficha pública y los favoritos. `id` es el identificador estable
 * que el móvil usa para abrir la ficha y guardar favoritos.
 */
export const publicEstablishmentSelect = `
  SELECT e.id,
         e.nombre_comercial AS "nombreComercial",
         l.nombre AS "localityName",
         COALESCE(activity_catalog.nombre, e.actividad) AS actividad,
         COALESCE(classification_catalog.nombre, e.clasificacion) AS clasificacion,
         COALESCE(category_catalog.nombre, e.categoria) AS categoria,
         CASE
           WHEN COALESCE(category_catalog.nombre, e.categoria) IS NULL THEN NULL
           ELSE CONCAT_WS(' · ',
             COALESCE(classification_catalog.nombre, e.clasificacion),
             COALESCE(category_catalog.nombre, e.categoria)
           )
         END AS "categoryLabel",
         e.direccion,
         e.telefono,
         e.latitud AS latitude,
         e.longitud AS longitude`;

export const publicEstablishmentJoin = `
    JOIN localidades l ON l.id = e.localidad_id
    JOIN cantones co ON co.id = l.canton_id
    JOIN provincias p ON p.id = co.provincia_id
    LEFT JOIN catalogo_catastro_actividades activity_catalog
      ON activity_catalog.id = e.actividad_catalogo_id
    LEFT JOIN catalogo_catastro_clasificaciones classification_catalog
      ON classification_catalog.id = e.clasificacion_catalogo_id
    LEFT JOIN catalogo_catastro_categorias category_catalog
      ON category_catalog.id = e.categoria_catalogo_id`;

/** Condición de visibilidad pública del catastro y de su territorio. */
export const publicEstablishmentCondition = `e.activo = TRUE
          AND e.eliminado_at IS NULL
          AND e.estado_revision = 'PUBLICADO'
          AND l.activo = TRUE
          AND co.activo = TRUE
          AND p.activo = TRUE`;

export type PublicEstablishmentRow = {
  id: string | number;
  nombreComercial: string;
  localityName: string;
  actividad: string;
  clasificacion: string | null;
  categoria: string | null;
  categoryLabel: string | null;
  direccion: string | null;
  telefono: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
  distanceMeters?: string | number | null;
};

export type PublicEstablishment = Readonly<{
  id: number;
  nombreComercial: string;
  actividad: string;
  clasificacion: string | null;
  categoria: string | null;
  categoriaEtiqueta: string | null;
  direccion: string | null;
  telefono: string | null;
  latitude: number | null;
  longitude: number | null;
  distanceMeters: number | null;
  localityName: string;
}>;

export function toPublicEstablishment(
  row: PublicEstablishmentRow,
): PublicEstablishment {
  return {
    id: Number(row.id),
    nombreComercial: row.nombreComercial,
    actividad: row.actividad,
    clasificacion: row.clasificacion,
    categoria: row.categoria,
    categoriaEtiqueta: row.categoryLabel,
    direccion: row.direccion,
    telefono: row.telefono,
    latitude: toNullableNumber(row.latitude),
    longitude: toNullableNumber(row.longitude),
    distanceMeters: toNullableNumber(row.distanceMeters),
    localityName: row.localityName,
  };
}

/** Ruta pública (sin firma ni clave de objeto) de una fotografía publicada. */
export function establishmentPhotoUrl(photoId: string | number): string {
  return `/api/v1/media/establishments/${photoId}`;
}

function toNullableNumber(
  value: string | number | null | undefined,
): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
