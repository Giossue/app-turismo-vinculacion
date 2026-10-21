import type { TurismoIconName } from "@/core/ui/turismo-icons";
import { messages } from "@/core/i18n/language";

/**
 * Grupos de establecimientos que el mapa puede filtrar. Las claves son el
 * `group` de cada punto de las teselas `/establishments/tiles` (ver
 * `apps/api/src/establishments/establishment-groups.ts`). Los `primary` van
 * como chips sobre el mapa; el resto, en "Ver más".
 */
export const establishmentMapGroups = [
  {
    key: "restaurants",
    get label() {
      return messages().places.establishment.groups.restaurants;
    },
    icon: "restaurant",
    primary: true,
  },
  {
    key: "cafes",
    get label() {
      return messages().places.establishment.groups.cafes;
    },
    icon: "coffee",
    primary: true,
  },
  {
    key: "lodging",
    get label() {
      return messages().places.establishment.groups.lodging;
    },
    icon: "hotel",
    primary: true,
  },
  {
    key: "bars",
    get label() {
      return messages().places.establishment.groups.bars;
    },
    icon: "wine",
    primary: true,
  },
  {
    key: "agencies",
    get label() {
      return messages().places.establishment.groups.agencies;
    },
    icon: "briefcase",
    primary: false,
  },
  {
    key: "guides",
    get label() {
      return messages().places.establishment.groups.guides;
    },
    icon: "flag",
    primary: false,
  },
  {
    key: "events",
    get label() {
      return messages().places.establishment.groups.events;
    },
    icon: "calendar",
    primary: false,
  },
  {
    key: "recreation",
    get label() {
      return messages().places.establishment.groups.recreation;
    },
    icon: "ticket",
    primary: false,
  },
  {
    key: "community",
    get label() {
      return messages().places.establishment.groups.community;
    },
    icon: "users",
    primary: false,
  },
  {
    key: "transport",
    get label() {
      return messages().places.establishment.groups.transport;
    },
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
