import type { TourismTabItem } from "@/core/ui/tourism-tabs";
import type { TurismoIconName } from "@/core/ui/turismo-icons";
import { routeModes, type RouteMode } from "../domain/routing";
import { messages } from "@/core/i18n/language";

export type RouteModeOption = TourismTabItem<RouteMode> &
  Readonly<{
    icon: TurismoIconName;
    /** Heading of the route panel, e.g. `En bicicleta`. */
    title: string;
  }>;

const routeModeIcons: Readonly<Record<RouteMode, TurismoIconName>> = {
  bicycle: "bike",
  car: "car",
  foot: "foot",
};

/** Tabs of the route mode picker, in the order of `routeModes`. */
export function getRouteModeOptions(): readonly RouteModeOption[] {
  return routeModes.map(getRouteModeOption);
}

export function getRouteModeOption(mode: RouteMode): RouteModeOption {
  const text = messages().routing.modes[mode];
  return {
    icon: routeModeIcons[mode],
    label: text.label,
    title: text.title,
    value: mode,
  };
}
