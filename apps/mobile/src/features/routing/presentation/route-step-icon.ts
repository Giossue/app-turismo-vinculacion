import type { TurismoIconName } from "@/core/ui/turismo-icons";
import type { CalculatedRoute } from "../domain/routing";

export type RouteStep = CalculatedRoute["steps"][number];

/** Maps an OSRM maneuver (`type` and `modifier`) to a direction icon. */
export function getRouteStepIcon(step: RouteStep): TurismoIconName {
  const maneuverType = step.maneuver.type.toLowerCase().replace(/[-_]/g, " ");
  const modifier = step.maneuver.modifier?.toLowerCase() ?? "";
  const turnsLeft = modifier.includes("left");
  const turnsRight = modifier.includes("right");
  const isSlightTurn = modifier.includes("slight");

  if (maneuverType === "arrive" || maneuverType === "destination") {
    return "flag";
  }
  if (maneuverType.includes("uturn") || maneuverType.includes("u turn")) {
    return turnsRight ? "redo" : "undo";
  }
  if (maneuverType.includes("roundabout") || maneuverType.includes("rotary")) {
    return "refresh";
  }
  if (turnsLeft) return isSlightTurn ? "cornerUpLeft" : "arrowLeft";
  if (turnsRight) return isSlightTurn ? "cornerUpRight" : "arrowRight";
  return "arrowUp";
}
