import { describe, expect, it } from "vitest";

import { isRouteMode } from "../domain/routing";
import {
  buildRouteHref,
  parseRouteDestination,
  parseRouteMode,
  parseRouteSearchParams,
} from "./route-href";

describe("route href", () => {
  it("serializes the destination and optional mode", () => {
    expect(
      buildRouteHref({ latitude: -1.59, longitude: -79, name: "Mirador" }),
    ).toEqual({
      pathname: "/route",
      params: {
        destinationLatitude: "-1.59",
        destinationLongitude: "-79",
        destinationName: "Mirador",
      },
    });
    expect(
      buildRouteHref(
        { latitude: -1.59, longitude: -79, name: "Mirador" },
        "foot",
      ),
    ).toMatchObject({ params: { mode: "foot" } });
  });

  it("round-trips through the route params", () => {
    const href = buildRouteHref(
      { latitude: -1.5934, longitude: -79.0008, name: "Plaza" },
      "bicycle",
    );
    const params = (href as { params: Record<string, string> }).params;

    expect(parseRouteSearchParams(params)).toEqual({
      destination: { latitude: -1.5934, longitude: -79.0008 },
      destinationName: "Plaza",
      mode: "bicycle",
    });
  });

  it("applies defaults and rejects invalid coordinates", () => {
    expect(parseRouteSearchParams({})).toEqual({
      destination: null,
      destinationName: "Destino",
      mode: "car",
    });
    expect(parseRouteDestination("91", "-79")).toBeNull();
    expect(parseRouteDestination("-1.59", "abc")).toBeNull();
    expect(parseRouteDestination(["-1.59", "0"], ["-79", "0"])).toEqual({
      latitude: -1.59,
      longitude: -79,
    });
  });

  it("accepts only known route modes", () => {
    expect(parseRouteMode("foot")).toBe("foot");
    expect(parseRouteMode("plane")).toBeNull();
    expect(isRouteMode("car")).toBe(true);
    expect(isRouteMode(3)).toBe(false);
  });
});
