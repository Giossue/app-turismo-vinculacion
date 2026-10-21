import { describe, expect, it } from "vitest";

import { isRouteMode } from "../domain/routing";
import {
  buildRouteHref,
  buildRoutePlaceHref,
  buildSavedRouteHref,
  parseRouteDestination,
  parseRouteWaypoints,
  parseRouteMode,
  parseRoutePlace,
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
      place: null,
      savedRouteKey: null,
      waypoints: [],
    });
  });

  it("applies defaults and rejects invalid coordinates", () => {
    expect(parseRouteSearchParams({})).toEqual({
      destination: null,
      destinationName: "Destino",
      mode: "car",
      place: null,
      savedRouteKey: null,
      waypoints: [],
    });
    expect(parseRouteDestination("91", "-79")).toBeNull();
    expect(parseRouteDestination("-1.59", "abc")).toBeNull();
    expect(parseRouteDestination(["-1.59", "0"], ["-79", "0"])).toEqual({
      latitude: -1.59,
      longitude: -79,
    });
  });

  it("opens a saved route by key without supplying a new GPS origin or destination", () => {
    const href = buildSavedRouteHref("route-test");
    expect(href).toEqual({
      pathname: "/route",
      params: { savedRouteKey: "route-test" },
    });
    const params = (href as { params: Record<string, string> }).params;
    expect(parseRouteSearchParams(params)).toEqual({
      destination: null,
      destinationName: "Destino",
      mode: "car",
      place: null,
      savedRouteKey: "route-test",
      waypoints: [],
    });
  });

  it("accepts only known route modes", () => {
    expect(parseRouteMode("foot")).toBe("foot");
    expect(parseRouteMode("plane")).toBeNull();
    expect(isRouteMode("car")).toBe(true);
    expect(isRouteMode(3)).toBe(false);
  });

  it("carries the catalogue place so arrival can offer its actions", () => {
    const href = buildRouteHref({
      latitude: -1.59,
      longitude: -79,
      name: "Museo",
      place: { kind: "establishment", id: 42 },
    });
    const params = (href as { params: Record<string, string> }).params;
    expect(params).toMatchObject({ placeKind: "establishment", placeId: "42" });
    expect(parseRouteSearchParams(params).place).toEqual({
      kind: "establishment",
      id: 42,
    });
    expect(
      parseRouteSearchParams(
        (
          buildRouteHref({
            latitude: -1.59,
            longitude: -79,
            name: "Centro",
            place: { kind: "center", code: "GUA-01" },
          }) as { params: Record<string, string> }
        ).params,
      ).place,
    ).toEqual({ kind: "center", code: "GUA-01" });
  });

  it("ignores incomplete or invalid places", () => {
    expect(parseRoutePlace("center", undefined)).toBeNull();
    expect(parseRoutePlace("establishment", "abc")).toBeNull();
    expect(parseRoutePlace("establishment", "0")).toBeNull();
    expect(parseRoutePlace("poi", "1")).toBeNull();
  });

  it("opens the place sheet, optionally on the opinions tab", () => {
    expect(
      buildRoutePlaceHref({ kind: "center", code: "GUA-01" }, "opinions"),
    ).toEqual({
      pathname: "/centers/[code]",
      params: { code: "GUA-01", tab: "opinions" },
    });
    expect(buildRoutePlaceHref({ kind: "establishment", id: 7 })).toBe(
      "/establishments/7",
    );
  });

  it("round-trips trip waypoints in order and rejects tampered lists", () => {
    const waypoints = [
      { latitude: -1.59, longitude: -79.0, name: "Mirador" },
      { latitude: -1.6, longitude: -79.01, name: "Museo" },
    ];
    const href = buildRouteHref(
      { latitude: -1.61, longitude: -79.02, name: "Plaza" },
      "foot",
      waypoints,
    ) as { params: Record<string, string> };
    expect(parseRouteSearchParams(href.params).waypoints).toEqual(waypoints);

    expect(parseRouteWaypoints("no es json")).toEqual([]);
    expect(parseRouteWaypoints(JSON.stringify([[95, -79, "Fuera"]]))).toEqual(
      [],
    );
    expect(
      parseRouteWaypoints(
        JSON.stringify(Array.from({ length: 5 }, () => [-1.5, -79, "Parada"])),
      ),
    ).toEqual([]);
    expect(
      parseRouteWaypoints(JSON.stringify([[-1.5, -79, "  Café\u0000 "]])),
    ).toEqual([{ latitude: -1.5, longitude: -79, name: "Café" }]);
  });
});
