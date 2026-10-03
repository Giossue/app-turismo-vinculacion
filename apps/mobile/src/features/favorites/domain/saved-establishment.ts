import type {
  PublicEstablishmentDetail,
  PublicMapEstablishment,
  SavedEstablishment,
} from "@/features/establishments/domain/establishment";

export type { SavedEstablishment };

/**
 * Optimistic copy of the saved list after a tap: `currentlySaved` removes the
 * establishment, otherwise it is moved to the top (the API lists newest first).
 */
export function toggleSavedEstablishment(
  list: readonly SavedEstablishment[],
  establishment: SavedEstablishment,
  currentlySaved: boolean,
): readonly SavedEstablishment[] {
  const rest = list.filter((item) => item.id !== establishment.id);
  return currentlySaved ? rest : [establishment, ...rest];
}

/**
 * Saved-list entry built from what the sheet already knows, shown until the
 * API's own copy arrives with the next refetch.
 */
export function toSavedEstablishment(
  establishment: PublicMapEstablishment & Readonly<{ id: number }>,
  detail?: PublicEstablishmentDetail,
): SavedEstablishment {
  if (detail) {
    const { photos, ...publicEstablishment } = detail;
    return { ...publicEstablishment, photoUrl: photos[0]?.url ?? null };
  }
  return {
    id: establishment.id,
    nombreComercial: establishment.name,
    actividad: "",
    clasificacion: null,
    categoria: establishment.category,
    categoriaEtiqueta: establishment.categoryLabel ?? null,
    direccion: null,
    telefono: null,
    latitude: establishment.latitude,
    longitude: establishment.longitude,
    distanceMeters: null,
    localityName: "",
    photoUrl: null,
  };
}

/** Map pin for a saved establishment, or null when it has no coordinates. */
export function savedEstablishmentToMap(
  establishment: SavedEstablishment,
  icon: string,
): PublicMapEstablishment | null {
  if (establishment.latitude === null || establishment.longitude === null) {
    return null;
  }
  return {
    id: establishment.id,
    name: establishment.nombreComercial,
    category: establishment.categoria,
    categoryLabel: establishment.categoriaEtiqueta ?? establishment.categoria,
    latitude: establishment.latitude,
    longitude: establishment.longitude,
    approximate: false,
    icon,
  };
}
