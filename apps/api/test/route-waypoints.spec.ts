import { ConfigService } from "@nestjs/config";
import { describe, expect, it, vi } from "vitest";

import { OsrmRoutingClient } from "../src/routing/infrastructure/osrm-routing.client";
import { routeRequestSchema } from "../src/routing/presentation/route.schema";

const point = (latitude: number, longitude: number) => ({
  latitude,
  longitude,
});

const step = (type: string, name = "") => ({
  distance: 100,
  duration: 20,
  name,
  maneuver: { type },
});

describe("recorrido con paradas", () => {
  it("acepta hasta cuatro paradas intermedias y rechaza más", () => {
    const base = {
      mode: "foot",
      origin: point(-1.59, -79),
      destination: point(-1.6, -79.01),
    };
    expect(routeRequestSchema.safeParse(base).success).toBe(true);
    expect(
      routeRequestSchema.safeParse({
        ...base,
        waypoints: Array.from({ length: 4 }, (_, index) =>
          point(-1.591 - index / 1000, -79),
        ),
      }).success,
    ).toBe(true);
    const tooMany = routeRequestSchema.safeParse({
      ...base,
      waypoints: Array.from({ length: 5 }, () => point(-1.595, -79)),
    });
    expect(tooMany.success).toBe(false);
    expect(
      routeRequestSchema.safeParse({
        ...base,
        waypoints: [point(95, -79)],
      }).success,
    ).toBe(false);
  });

  it("envía las paradas en orden y numera las llegadas intermedias", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: "Ok",
        routes: [
          {
            distance: 600,
            duration: 120,
            geometry: {
              type: "LineString",
              coordinates: [
                [-79, -1.59],
                [-79.01, -1.6],
              ],
            },
            legs: [
              { steps: [step("depart", "Sucre"), step("arrive")] },
              { steps: [step("depart"), step("arrive")] },
              { steps: [step("depart"), step("arrive")] },
            ],
          },
        ],
      }),
    });
    const client = new OsrmRoutingClient(
      new ConfigService({
        ROUTING_OSRM_FOOT_URL: "http://osrm-foot:5000",
        ROUTING_REQUEST_TIMEOUT_MS: 8_000,
      }),
      fetcher,
    );

    const route = await client.calculate({
      mode: "foot",
      origin: point(-1.59, -79),
      waypoints: [point(-1.592, -79.002), point(-1.595, -79.005)],
      destination: point(-1.6, -79.01),
    });

    const [url] = fetcher.mock.calls[0] as [URL, RequestInit];
    expect(String(url)).toContain(
      "/route/v1/walking/-79,-1.59;-79.002,-1.592;-79.005,-1.595;-79.01,-1.6",
    );
    expect(
      route.steps
        .filter((item) => item.maneuver.type === "arrive")
        .map((item) => item.instruction),
    ).toEqual([
      "Llegaste a la parada 1",
      "Llegaste a la parada 2",
      "Has llegado a tu destino",
    ]);
  });
});
