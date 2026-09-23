import type { TurismoIconName } from "@/core/ui/turismo-icons";

/**
 * Grupos de establecimientos que el mapa puede filtrar. Las claves son las
 * del parámetro `group` de `/establishments/map` (ver
 * `apps/api/src/establishments/establishment-groups.ts`). Los `primary` van
 * como chips sobre el mapa; el resto, en "Ver más".
 */
export const establishmentMapGroups = [
  {
    key: "restaurants",
    label: "Restaurantes",
    icon: "restaurant",
    primary: true,
  },
  { key: "cafes", label: "Cafeterías", icon: "coffee", primary: true },
  { key: "lodging", label: "Alojamiento", icon: "hotel", primary: true },
  { key: "bars", label: "Bares", icon: "wine", primary: true },
  {
    key: "agencies",
    label: "Agencias de viaje",
    icon: "briefcase",
    primary: false,
  },
  { key: "guides", label: "Guías de turismo", icon: "flag", primary: false },
  { key: "events", label: "Eventos", icon: "calendar", primary: false },
  { key: "recreation", label: "Recreación", icon: "ticket", primary: false },
  {
    key: "community",
    label: "Turismo comunitario",
    icon: "users",
    primary: false,
  },
  {
    key: "transport",
    label: "Transporte turístico",
    icon: "bus",
    primary: false,
  },
] as const satisfies readonly Readonly<{
  key: string;
  label: string;
  icon: TurismoIconName;
  primary: boolean;
}>[];

export type EstablishmentMapGroup =
  (typeof establishmentMapGroups)[number]["key"];

export type EstablishmentMapGroupOption =
  (typeof establishmentMapGroups)[number];

export function getEstablishmentMapGroup(
  key: EstablishmentMapGroup,
): EstablishmentMapGroupOption {
  const group = establishmentMapGroups.find((option) => option.key === key);
  if (!group) throw new Error(`Grupo de establecimientos desconocido: ${key}`);
  return group;
}
