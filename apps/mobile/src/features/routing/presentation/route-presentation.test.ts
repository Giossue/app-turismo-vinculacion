import { describe, expect, it } from "vitest";

import { routeModes } from "../domain/routing";
import { getRouteModeOption, routeModeOptions } from "./route-mode-options";
import { getRouteStepIcon, type RouteStep } from "./route-step-icon";

function step(type: string, modifier: string | null = null): RouteStep {
  return {
    distanceMeters: 10,
    durationSeconds: 5,
    instruction: "Continúa",
    maneuver: { exit: null, modifier, type },
    name: null,
  };
}

describe("route mode options", () => {
  it("offers every route mode once, in order", () => {
    expect(routeModeOptions.map((option) => option.value)).toEqual([
      ...routeModes,
    ]);
  });

  it("titles the panel after the mode", () => {
    expect(getRouteModeOption("car").title).toBe("En automóvil");
    expect(getRouteModeOption("bicycle").title).toBe("En bicicleta");
    expect(getRouteModeOption("foot").title).toBe("A pie");
  });
});

describe("getRouteStepIcon", () => {
  it.each([
    [step("arrive"), "flag"],
    [step("turn", "left"), "arrowLeft"],
    [step("turn", "slight right"), "cornerUpRight"],
    [step("continue", "uturn"), "undo"],
    [step("u-turn", "right"), "redo"],
    [step("roundabout", "right"), "refresh"],
    [step("depart"), "arrowUp"],
  ] as const)("maps the maneuver to its icon (%#)", (routeStep, icon) => {
    expect(getRouteStepIcon(routeStep)).toBe(icon);
  });
});
