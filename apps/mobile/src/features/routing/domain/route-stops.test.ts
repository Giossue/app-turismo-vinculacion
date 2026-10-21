import { describe, expect, it } from "vitest";

import {
  countReachedStops,
  getRouteStops,
  getStopArrivalStepIndexes,
} from "./route-stops";
import type { CalculatedRoute } from "./routing";

const step = (type: string) => ({
  instruction: type,
  distanceMeters: 100,
  durationSeconds: 20,
  name: null,
  maneuver: { type, modifier: null, exit: null },
});

/** depart, arrive (parada 1), depart, arrive (parada 2), depart, arrive (destino). */
const tripRoute: CalculatedRoute = {
  mode: "foot",
  distanceMeters: 600,
  durationSeconds: 120,
  geometry: {
    type: "LineString",
    coordinates: [
      [-79, -1.59],
      [-79.01, -1.6],
    ],
  },
  steps: [
    step("depart"),
    step("arrive"),
    step("depart"),
    step("arrive"),
    step("depart"),
    step("arrive"),
  ],
};

const first = { latitude: -1.592, longitude: -79.002, name: "Mirador" };
const second = { latitude: -1.595, longitude: -79.005, name: "Museo" };
const far = { latitude: -1.7, longitude: -79.2 };

describe("route stops", () => {
  it("lists only intermediate arrivals", () => {
    expect(getStopArrivalStepIndexes(tripRoute)).toEqual([1, 3]);
  });

  it("matches the route with the pending stops it was requested with", () => {
    expect(getRouteStops(tripRoute, [first, second])).toEqual([first, second]);
    // Tras un recálculo con una sola parada pendiente.
    const rerouted = { ...tripRoute, steps: tripRoute.steps.slice(2) };
    expect(getRouteStops(rerouted, [first, second])).toEqual([second]);
    expect(getRouteStops(null, [first])).toEqual([]);
    expect(getRouteStops(tripRoute, [])).toEqual([]);
  });

  it("reaches a stop by proximity", () => {
    expect(
      countReachedStops({
        coordinate: first,
        guidanceStepIndex: 1,
        pendingStops: [first, second],
        reachedOnRoute: 0,
        route: tripRoute,
      }),
    ).toBe(1);
  });

  it("reaches stops already passed on the trace, in order", () => {
    expect(
      countReachedStops({
        coordinate: far,
        guidanceStepIndex: 4,
        pendingStops: [first, second],
        reachedOnRoute: 0,
        route: tripRoute,
      }),
    ).toBe(2);
    expect(
      countReachedStops({
        coordinate: far,
        guidanceStepIndex: 2,
        pendingStops: [second],
        reachedOnRoute: 1,
        route: tripRoute,
      }),
    ).toBe(0);
  });

  it("does not skip a stop that is neither near nor passed", () => {
    expect(
      countReachedStops({
        coordinate: second,
        guidanceStepIndex: 1,
        pendingStops: [first, second],
        reachedOnRoute: 0,
        route: tripRoute,
      }),
    ).toBe(0);
  });
});
