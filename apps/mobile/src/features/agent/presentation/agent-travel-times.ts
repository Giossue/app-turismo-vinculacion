import { formatDurationSeconds } from "@/core/format/duration";
import type { TurismoIconName } from "@/core/ui/turismo-icons";
import type { RouteMode } from "@/features/routing/domain/routing";
import { getRouteModeOption } from "@/features/routing/presentation/route-mode-options";
import type { AgentTravelTime } from "../domain/agent";

export const AGENT_TRAVEL_TIMES_CAPTION =
  "Tiempos estimados desde tu ubicación aproximada";

const displayModes = ["car", "foot", "bicycle"] as const;
const labels: Readonly<Record<RouteMode, string>> = {
  car: "Carro",
  foot: "A pie",
  bicycle: "Bici",
};

type AgentTravelTimeRow = Readonly<{
  mode: RouteMode;
  icon: TurismoIconName;
  label: string;
  value: string;
}>;

/** Only server estimates are displayed; missing responses never imply a time. */
export function getAgentTravelTimeRows(
  estimates: readonly AgentTravelTime[] | undefined,
): readonly AgentTravelTimeRow[] {
  if (!estimates) return [];
  return displayModes.flatMap((mode) => {
    const estimate = estimates.find((entry) => entry.mode === mode);
    if (!estimate) return [];
    return [
      {
        mode,
        icon: getRouteModeOption(mode).icon,
        label: labels[mode],
        value:
          estimate.status === "available"
            ? formatDurationSeconds(estimate.durationSeconds)
            : estimate.status === "no_route"
              ? "Sin ruta"
              : "No disponible",
      },
    ];
  });
}

/** A card is a single accessible button, so its label includes every mode. */
export function getAgentTravelTimesAccessibilityLabel(
  estimates: readonly AgentTravelTime[] | undefined,
): string {
  const rows = getAgentTravelTimeRows(estimates);
  return rows.length
    ? `${AGENT_TRAVEL_TIMES_CAPTION}. ${rows.map((row) => `${row.label}: ${row.value}`).join(". ")}`
    : "";
}
