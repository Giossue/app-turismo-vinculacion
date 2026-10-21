import { getLanguage } from "@/core/i18n/language";
import type { CalculatedRoute } from "./routing";

type RouteStep = CalculatedRoute["steps"][number];

const modifierLabels: Readonly<Record<string, string>> = {
  left: "left",
  right: "right",
  straight: "straight",
  "slight left": "slightly left",
  "slight right": "slightly right",
  "sharp left": "sharp left",
  "sharp right": "sharp right",
  uturn: "into a U-turn",
};

/**
 * Indicación de un paso en el idioma activo. La API redacta las indicaciones
 * en español; en inglés se reconstruyen desde la maniobra, la vía y la salida
 * que acompañan a cada paso. Las llegadas intermedias se numeran como paradas.
 */
export function getStepInstruction(
  route: CalculatedRoute,
  stepIndex: number,
): string {
  const step = route.steps[stepIndex];
  if (!step) return "";
  if (getLanguage() === "es") return step.instruction;
  if (step.maneuver.type === "arrive" && stepIndex < route.steps.length - 1) {
    const stopNumber = route.steps
      .slice(0, stepIndex + 1)
      .filter((item) => item.maneuver.type === "arrive").length;
    return `You have reached stop ${stopNumber}`;
  }
  return formatEnglishInstruction(step);
}

export function formatEnglishInstruction(step: RouteStep): string {
  const name = step.name?.trim() ?? "";
  const road = name ? ` onto ${name}` : "";
  const modifier = step.maneuver.modifier;
  const direction = modifier ? (modifierLabels[modifier] ?? modifier) : "";
  const withDirection = direction ? ` ${direction}` : "";

  switch (step.maneuver.type) {
    case "depart":
      return name ? `Head out on ${name}` : "Start from your location";
    case "arrive":
      return "You have arrived at your destination";
    case "roundabout":
    case "rotary":
    case "roundabout turn":
    case "exit roundabout":
      return step.maneuver.exit
        ? `At the roundabout, take exit ${step.maneuver.exit}${road}`
        : `Continue around the roundabout${road}`;
    case "turn":
      return `Turn ${direction || "at the next intersection"}${road}`;
    case "new name":
      return name ? `Continue on ${name}` : "Continue on the main road";
    case "merge":
      return `Merge${withDirection}${road}`;
    case "on ramp":
      return `Take the ramp${withDirection}${road}`;
    case "off ramp":
      return `Take the exit${withDirection}${road}`;
    case "fork":
      return `Keep${withDirection} at the fork${road}`;
    case "end of road":
      return `At the end of the road, turn${withDirection}${road}`;
    case "continue":
      return direction && direction !== "straight"
        ? `Continue ${direction}${road}`
        : `Continue straight${road}`;
    default:
      return name ? `Follow ${name}` : "Continue toward your destination";
  }
}
