import { describe, expect, it } from "vitest";

import { parseRouteSearchParams } from "@/features/routing/presentation/route-href";
import {
  addTripStop,
  buildCenterTripStop,
  buildEstablishmentTripStop,
  buildTripRouteHref,
  maxTripStops,
  moveTripStop,
  removeTripStop,
  type TripStop,
} from "./trip";

const center = (code: string, latitude = -1.59) =>
  buildCenterTripStop({ code, latitude, longitude: -79, name: code });

describe("trip", () => {
  it("adds once and up to the limit", () => {
    let stops: readonly TripStop[] = [];
    for (let index = 0; index < maxTripStops; index += 1) {
      const result = addTripStop(stops, center(`C${index}`));
      expect(result.outcome).toBe("added");
      stops = result.stops;
    }
    expect(addTripStop(stops, center("C0")).outcome).toBe("duplicate");
    expect(addTripStop(stops, center("C9"))).toEqual({
      outcome: "full",
      stops,
    });
  });

  it("moves and removes stops", () => {
    const stops = [center("A"), center("B"), center("C")];
    expect(
      moveTripStop(stops, "center:C", -1).map((stop) => stop.name),
    ).toEqual(["A", "C", "B"]);
    expect(moveTripStop(stops, "center:A", -1)).toBe(stops);
    expect(removeTripStop(stops, "center:B").map((stop) => stop.name)).toEqual([
      "A",
      "C",
    ]);
  });

  it("needs an id and coordinates for establishments", () => {
    expect(
      buildEstablishmentTripStop({
        id: undefined,
        latitude: -1.5,
        longitude: -79,
        name: "Hostal",
      }),
    ).toBeNull();
    expect(
      buildEstablishmentTripStop({
        id: 7,
        latitude: null,
        longitude: -79,
        name: "Hostal",
      }),
    ).toBeNull();
    expect(
      buildEstablishmentTripStop({
        id: 7,
        latitude: -1.5,
        longitude: -79,
        name: "Hostal",
      })?.key,
    ).toBe("establishment:7");
  });

  it("routes to the last stop through the others, in order", () => {
    expect(buildTripRouteHref([])).toBeNull();
    const href = buildTripRouteHref([
      center("A", -1.59),
      center("B", -1.6),
      center("C", -1.61),
    ]) as { params: Record<string, string> };
    const parsed = parseRouteSearchParams(href.params);
    expect(parsed.destinationName).toBe("C");
    expect(parsed.place).toEqual({ kind: "center", code: "C" });
    expect(parsed.waypoints.map((stop) => stop.name)).toEqual(["A", "B"]);
  });
});
