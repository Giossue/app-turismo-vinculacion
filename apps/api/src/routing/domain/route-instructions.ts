export type RouteInstructionInput = Readonly<{
  name: string;
  maneuver: Readonly<{
    type: string;
    modifier?: string | null;
    exit?: number | null;
  }>;
}>;

const modifierLabels: Record<string, string> = {
  left: "a la izquierda",
  right: "a la derecha",
  straight: "de frente",
  "slight left": "ligeramente a la izquierda",
  "slight right": "ligeramente a la derecha",
  "sharp left": "cerrado a la izquierda",
  "sharp right": "cerrado a la derecha",
  uturn: "en U",
};

export function formatRouteInstruction(step: RouteInstructionInput): string {
  const name = step.name.trim();
  const road = name ? ` por ${name}` : "";
  const direction = step.maneuver.modifier
    ? (modifierLabels[step.maneuver.modifier] ?? step.maneuver.modifier)
    : "";

  switch (step.maneuver.type) {
    case "depart":
      return name ? `Sal por ${name}` : "Sal desde tu ubicación";
    case "arrive":
      return "Has llegado a tu destino";
    case "roundabout":
    case "rotary":
    case "roundabout turn":
    case "exit roundabout":
      return step.maneuver.exit
        ? `En la rotonda, toma la salida ${step.maneuver.exit}${road}`
        : `Continúa en la rotonda${road}`;
    case "turn":
      return `Gira ${direction || "en la próxima intersección"}${road}`;
    case "new name":
      return name ? `Continúa por ${name}` : "Continúa por la vía principal";
    case "merge":
      return `Incorpórate${direction ? ` ${direction}` : ""}${road}`;
    case "on ramp":
      return `Toma la incorporación${direction ? ` ${direction}` : ""}${road}`;
    case "off ramp":
      return `Toma la salida${direction ? ` ${direction}` : ""}${road}`;
    case "fork":
      return `Toma la bifurcación${direction ? ` ${direction}` : ""}${road}`;
    case "end of road":
      return `Al final de la vía, gira${direction ? ` ${direction}` : ""}${road}`;
    case "continue":
      return direction && direction !== "de frente"
        ? `Continúa ${direction}${road}`
        : `Continúa de frente${road}`;
    default:
      return name ? `Sigue por ${name}` : "Continúa hacia tu destino";
  }
}
