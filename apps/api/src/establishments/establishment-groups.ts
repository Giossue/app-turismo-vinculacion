/**
 * Grupos de establecimientos que el mapa público puede filtrar. Se definen
 * por los nombres del catálogo del catastro (actividad o tipo), no por el
 * texto libre del consolidado, que tiene variantes ("RESTAURANTES",
 * "CAFETERIA"…). El móvil usa las mismas claves.
 */
export const ESTABLISHMENT_MAP_GROUPS = {
  restaurants: { classifications: ["RESTAURANTE", "PLAZAS DE COMIDA"] },
  cafes: { classifications: ["CAFETERÍA"] },
  lodging: { activities: ["ALOJAMIENTO"] },
  bars: { classifications: ["BAR", "DISCOTECA"] },
  agencies: { activities: ["AGENCIAMIENTO TURÍSTICO"] },
  guides: { activities: ["GUIANZA TURÍSTICA"] },
  events: {
    activities: ["ORGANIZADORES DE EVENTOS, CONGRESOS Y CONVENCIONES"],
  },
  recreation: { activities: ["PARQUES DE ATRACCIONES ESTABLES"] },
  community: { activities: ["CENTROS DE TURISMO COMUNITARIO"] },
  transport: { activities: ["TRANSPORTE TURÍSTICO"] },
} as const satisfies Record<
  string,
  Readonly<{
    activities?: readonly string[];
    classifications?: readonly string[];
  }>
>;

export type EstablishmentMapGroup = keyof typeof ESTABLISHMENT_MAP_GROUPS;

export const ESTABLISHMENT_MAP_GROUP_KEYS = Object.keys(
  ESTABLISHMENT_MAP_GROUPS,
) as EstablishmentMapGroup[];
