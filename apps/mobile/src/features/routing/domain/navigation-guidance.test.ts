import { describe, expect, it } from "vitest";

import {
  getDistanceMeters,
  getDistanceToRouteMeters,
  getNavigationGuidance,
  getNavigationNotification,
  getRouteRemainingMetrics,
} from "./navigation-guidance";
import type { CalculatedRoute } from "./routing";

const route: CalculatedRoute = {
  mode: "car",
  distanceMeters: 220,
  durationSeconds: 60,
  geometry: {
    type: "LineString",
    coordinates: [
      [-79, -1.59],
      [-79.001, -1.59],
      [-79.002, -1.59],
    ],
  },
  steps: [
    {
      instruction: "Continúa por la avenida principal",
      distanceMeters: 110,
      durationSeconds: 30,
      name: "Avenida principal",
      maneuver: { type: "depart", modifier: null, exit: null },
    },
    {
      instruction: "Gira a la derecha hacia el destino",
      distanceMeters: 110,
      durationSeconds: 30,
      name: "Calle del destino",
      maneuver: { type: "turn", modifier: "right", exit: null },
    },
  ],
};

describe("navigation guidance", () => {
  it("calculates geographic distance in meters", () => {
    const distance = getDistanceMeters(
      { latitude: -1.59, longitude: -79 },
      { latitude: -1.59, longitude: -79.001 },
    );

    expect(distance).toBeGreaterThan(100);
    expect(distance).toBeLessThan(115);
  });

  it("measures distance from the current location to the route", () => {
    const distance = getDistanceToRouteMeters(route, {
      latitude: -1.59,
      longitude: -79.001,
    });

    expect(distance).toBeLessThan(5);
  });

  it("selects the next step from the current progress", () => {
    expect(
      getNavigationGuidance(route, {
        latitude: -1.59,
        longitude: -79.0015,
      }),
    ).toMatchObject({
      instruction: "Gira a la derecha hacia el destino",
      stepIndex: 1,
    });
  });

  it("estimates remaining distance and duration from route progress", () => {
    expect(
      getRouteRemainingMetrics(route, {
        latitude: -1.59,
        longitude: -79.0015,
      }),
    ).toEqual({ distanceMeters: 110, durationSeconds: 30 });
  });

  it("formats a dynamic notification for the next maneuver", () => {
    expect(
      getNavigationNotification({
        distanceMeters: 184,
        instruction: "Gira a la derecha por Calle R-23",
        stepIndex: 1,
      }),
    ).toEqual({
      body: "En 180 m: Gira a la derecha por Calle R-23",
      key: "1:180 m:Gira a la derecha por Calle R-23",
    });
  });
});
