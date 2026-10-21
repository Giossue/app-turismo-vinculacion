import { describe, expect, it } from "vitest";

import { getRemoteRouteRequest } from "./route-source";

const origin = { latitude: -1.593, longitude: -79.001 };
const destination = { latitude: -1.594, longitude: -79 };

describe("route source", () => {
  it("never requests a new route for a chosen local preview", () => {
    expect(
      getRemoteRouteRequest({
        saved: true,
        requested: true,
        mode: "foot",
        origin,
        destination,
      }),
    ).toBeNull();
  });

  it("calculates online only after a requested route has both coordinates", () => {
    const input = {
      saved: false,
      requested: true,
      mode: "foot" as const,
      origin,
      destination,
    };
    expect(getRemoteRouteRequest(input)).toEqual({
      mode: "foot",
      origin,
      destination,
    });
    expect(getRemoteRouteRequest({ ...input, origin: null })).toBeNull();
    expect(getRemoteRouteRequest({ ...input, destination: null })).toBeNull();
    expect(getRemoteRouteRequest({ ...input, requested: false })).toBeNull();
  });

  it("sends only the coordinates of pending trip stops", () => {
    const stop = { latitude: -1.6, longitude: -79.01, name: "Mirador" };
    expect(
      getRemoteRouteRequest({
        saved: false,
        requested: true,
        mode: "car",
        origin,
        destination,
        waypoints: [stop],
      }),
    ).toEqual({
      mode: "car",
      origin,
      waypoints: [{ latitude: -1.6, longitude: -79.01 }],
      destination,
    });
  });
});
