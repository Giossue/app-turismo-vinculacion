import { describe, expect, it } from "vitest";

import type { AgentTravelTime } from "../domain/agent";
import {
  AGENT_TRAVEL_TIMES_CAPTION,
  getAgentTravelTimeRows,
  getAgentTravelTimesAccessibilityLabel,
} from "./agent-travel-times";

describe("agent travel time presentation", () => {
  it("shows route estimates in car, foot and bicycle order", () => {
    const estimates: readonly AgentTravelTime[] = [
      {
        mode: "bicycle",
        status: "available",
        durationSeconds: 181,
        distanceMeters: 650,
      },
      {
        mode: "car",
        status: "available",
        durationSeconds: 0,
        distanceMeters: 0,
      },
      {
        mode: "foot",
        status: "available",
        durationSeconds: 3_900,
        distanceMeters: 4_500,
      },
    ];

    expect(getAgentTravelTimeRows(estimates)).toEqual([
      { mode: "car", icon: "car", label: "Carro", value: "<1 min" },
      { mode: "foot", icon: "foot", label: "A pie", value: "1 h 5 min" },
      { mode: "bicycle", icon: "bike", label: "Bici", value: "4 min" },
    ]);
  });

  it("distinguishes no route from unavailable and includes both in the button label", () => {
    const estimates: readonly AgentTravelTime[] = [
      { mode: "car", status: "unavailable" },
      { mode: "foot", status: "no_route" },
      {
        mode: "bicycle",
        status: "available",
        durationSeconds: 610,
        distanceMeters: 900,
      },
    ];

    expect(getAgentTravelTimeRows(estimates).map((row) => row.value)).toEqual([
      "No disponible",
      "Sin ruta",
      "11 min",
    ]);
    expect(getAgentTravelTimesAccessibilityLabel(estimates)).toBe(
      `${AGENT_TRAVEL_TIMES_CAPTION}. Carro: No disponible. A pie: Sin ruta. Bici: 11 min`,
    );
  });

  it("does not invent route information for older responses", () => {
    expect(getAgentTravelTimeRows(undefined)).toEqual([]);
    expect(getAgentTravelTimesAccessibilityLabel(undefined)).toBe("");
  });
});
