import { describe, expect, it, vi } from "vitest";

import { calculateRoute } from "./routing-api";

const route = {
  mode: "car",
  distanceMeters: 846,
  durationSeconds: 114.7,
  geometry: {
    type: "LineString",
    coordinates: [
      [-79.001, -1.593],
      [-79, -1.594],
    ],
  },
  steps: [
    {
      instruction: "Gira a la derecha por General Salazar",
      distanceMeters: 846,
      durationSeconds: 114.7,
      name: "General Salazar",
      maneuver: { type: "turn", modifier: "right", exit: null },
    },
  ],
};

describe("calculateRoute", () => {
  it("posts the validated route request and returns the normalized data", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: route }),
    });
    const request = {
      mode: "car" as const,
      origin: { latitude: -1.593, longitude: -79.001 },
      destination: { latitude: -1.594, longitude: -79 },
    };

    await expect(
      calculateRoute(request, {
        apiUrl: "http://api.test/api/v1",
        fetcher,
      }),
    ).resolves.toEqual(route);
    expect(fetcher).toHaveBeenCalledWith(
      "http://api.test/api/v1/routing/route",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(request),
      }),
    );
  });

  it("rejects malformed route responses", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { mode: "car" } }),
    });

    await expect(
      calculateRoute(
        {
          mode: "car",
          origin: { latitude: -1.593, longitude: -79.001 },
          destination: { latitude: -1.594, longitude: -79 },
        },
        { apiUrl: "http://api.test/api/v1", fetcher },
      ),
    ).rejects.toThrow("formato esperado");
  });

  it("explains routing failures without exposing technical details", async () => {
    const request = {
      mode: "foot" as const,
      origin: { latitude: -1.593, longitude: -79.001 },
      destination: { latitude: -1.594, longitude: -79 },
    };
    const options = { apiUrl: "http://api.test/api/v1" };

    await expect(
      calculateRoute(request, {
        ...options,
        fetcher: vi.fn().mockResolvedValue({ ok: false, status: 422 }),
      }),
    ).rejects.toThrow("No encontramos una ruta posible entre esos puntos.");
    await expect(
      calculateRoute(request, {
        ...options,
        fetcher: vi
          .fn()
          .mockRejectedValue(new TypeError("Network request failed")),
      }),
    ).rejects.toThrow("No pudimos calcular la ruta.");
  });
});
