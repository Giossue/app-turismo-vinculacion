import { ConfigService } from "@nestjs/config";
import { describe, expect, it, vi } from "vitest";

import { OsrmRoutingClient } from "../src/routing/infrastructure/osrm-routing.client";

describe("OsrmRoutingClient", () => {
  it("uses the selected OSRM profile and normalizes the route", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: "Ok",
        routes: [
          {
            distance: 846,
            duration: 114.7,
            geometry: {
              type: "LineString",
              coordinates: [
                [-79.001, -1.593],
                [-79, -1.594],
              ],
            },
            legs: [
              {
                steps: [
                  {
                    distance: 846,
                    duration: 114.7,
                    name: "General Salazar",
                    maneuver: { type: "turn", modifier: "right" },
                  },
                ],
              },
            ],
          },
        ],
      }),
    });
    const config = new ConfigService({
      ROUTING_OSRM_BICYCLE_URL: "http://osrm-bicycle:5000",
      ROUTING_REQUEST_TIMEOUT_MS: 8_000,
    });
    const client = new OsrmRoutingClient(config, fetcher);

    await expect(
      client.calculate({
        mode: "bicycle",
        origin: { latitude: -1.593, longitude: -79.001 },
        destination: { latitude: -1.594, longitude: -79 },
      }),
    ).resolves.toMatchObject({
      mode: "bicycle",
      distanceMeters: 846,
      durationSeconds: 114.7,
      steps: [{ instruction: "Gira a la derecha por General Salazar" }],
    });

    const [url] = fetcher.mock.calls[0] as [URL, RequestInit];
    expect(String(url)).toContain(
      "http://osrm-bicycle:5000/route/v1/cycling/-79.001,-1.593;-79,-1.594",
    );
    expect(String(url)).toContain("steps=true");
  });

  it("reports a provider failure without exposing the route URL", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("network down"));
    const config = new ConfigService({
      ROUTING_OSRM_CAR_URL: "http://osrm-car:5000",
      ROUTING_REQUEST_TIMEOUT_MS: 8_000,
    });
    const client = new OsrmRoutingClient(config, fetcher);

    await expect(
      client.calculate({
        mode: "car",
        origin: { latitude: -1.593, longitude: -79.001 },
        destination: { latitude: -1.594, longitude: -79 },
      }),
    ).rejects.toThrow("servicio de rutas");
    await expect(
      client.calculate({
        mode: "car",
        origin: { latitude: -1.593, longitude: -79.001 },
        destination: { latitude: -1.594, longitude: -79 },
      }),
    ).rejects.not.toThrow("-79.001");
  });
});
