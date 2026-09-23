import type { TourismTabItem } from "@/core/ui/tourism-tabs";
import type { TurismoIconName } from "@/core/ui/turismo-icons";
import { routeModes, type RouteMode } from "../domain/routing";

export type RouteModeOption = TourismTabItem<RouteMode> &
  Readonly<{
    icon: TurismoIconName;
    /** Heading of the route panel, e.g. `En bicicleta`. */
    title: string;
  }>;

const routeModeOptionsByMode: Readonly<Record<RouteMode, RouteModeOption>> = {
  bicycle: {
    icon: "bike",
    label: "Bicicleta",
    title: "En bicicleta",
    value: "bicycle",
  },
  car: { icon: "car", label: "Auto", title: "En automóvil", value: "car" },
  foot: { icon: "foot", label: "A pie", title: "A pie", value: "foot" },
};

/** Tabs of the route mode picker, in the order of `routeModes`. */
export const routeModeOptions: readonly RouteModeOption[] = routeModes.map(
  (mode) => routeModeOptionsByMode[mode],
);

export function getRouteModeOption(mode: RouteMode): RouteModeOption {
  return routeModeOptionsByMode[mode];
}
