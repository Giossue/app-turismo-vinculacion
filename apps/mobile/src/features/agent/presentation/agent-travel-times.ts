import { formatDurationSeconds } from "@/core/format/duration";
import type { TurismoIconName } from "@/core/ui/turismo-icons";
import type { RouteMode } from "@/features/routing/domain/routing";
import { getRouteModeOption } from "@/features/routing/presentation/route-mode-options";
import type { AgentTravelTime } from "../domain/agent";
import { messages } from "@/core/i18n/language";

const displayModes = ["car", "foot", "bicycle"] as const;

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
        label: messages().agent.travel[mode],
        value:
          estimate.status === "available"
            ? formatDurationSeconds(estimate.durationSeconds)
            : estimate.status === "no_route"
              ? messages().agent.travel.noRoute
              : messages().agent.travel.unavailable,
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
    ? `${messages().agent.travel.caption}. ${rows.map((row) => `${row.label}: ${row.value}`).join(". ")}`
    : "";
}
