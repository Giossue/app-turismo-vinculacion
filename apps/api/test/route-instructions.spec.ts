import { describe, expect, it } from "vitest";

import { formatRouteInstruction } from "../src/routing/domain/route-instructions";

describe("formatRouteInstruction", () => {
  it("translates a named turn into a Spanish instruction", () => {
    expect(
      formatRouteInstruction({
        name: "General Salazar",
        maneuver: { type: "turn", modifier: "right" },
      }),
    ).toBe("Gira a la derecha por General Salazar");
  });

  it("includes the exit number for a roundabout", () => {
    expect(
      formatRouteInstruction({
        name: "Avenida de los Andes",
        maneuver: { type: "roundabout", exit: 2 },
      }),
    ).toBe("En la rotonda, toma la salida 2 por Avenida de los Andes");
  });

  it("handles the start and arrival instructions without a street name", () => {
    expect(
      formatRouteInstruction({ name: "", maneuver: { type: "depart" } }),
    ).toBe("Sal desde tu ubicación");
    expect(
      formatRouteInstruction({ name: "", maneuver: { type: "arrive" } }),
    ).toBe("Has llegado a tu destino");
  });
});
