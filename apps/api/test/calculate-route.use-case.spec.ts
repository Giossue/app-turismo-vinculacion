import { describe, expect, it, vi } from "vitest";

import { CalculateRouteUseCase } from "../src/routing/application/calculate-route.use-case";
import type { RoutingProvider } from "../src/routing/application/routing-provider";
import type { TravelTimesRequest } from "../src/routing/domain/route";

const request: TravelTimesRequest = {
  origin: { latitude: -1.593, longitude: -79.001 },
  destinations: [{ latitude: -1.594, longitude: -79 }],
};

function provider(): RoutingProvider {
  return {
    calculate: vi.fn(),
    estimateTravelTimes: vi.fn().mockResolvedValue([
      [
        {
          mode: "car",
          status: "available",
          durationSeconds: 120,
          distanceMeters: 846,
        },
        { mode: "foot", status: "no_route" },
        { mode: "bicycle", status: "unavailable" },
      ],
    ]),
  };
}

describe("CalculateRouteUseCase travel times", () => {
  it("passes the caller signal to the routing provider", async () => {
    const routingProvider = provider();
    const useCase = new CalculateRouteUseCase(routingProvider);
    const controller = new AbortController();

    await expect(
      useCase.estimateTravelTimes(request, controller.signal),
    ).resolves.toMatchObject([
      [
        { mode: "car", durationSeconds: 120 },
        { mode: "foot", status: "no_route" },
        { mode: "bicycle", status: "unavailable" },
      ],
    ]);
    expect(routingProvider.estimateTravelTimes).toHaveBeenCalledWith(
      request,
      controller.signal,
    );
  });

  it("rejects more than six destinations before querying the provider", () => {
    const routingProvider = provider();
    const useCase = new CalculateRouteUseCase(routingProvider);

    expect(() =>
      useCase.estimateTravelTimes({
        ...request,
        destinations: Array.from({ length: 7 }, () => request.destinations[0]),
      }),
    ).toThrow("seis destinos");
    expect(routingProvider.estimateTravelTimes).not.toHaveBeenCalled();
  });

  it("returns an empty result without querying routes", async () => {
    const routingProvider = provider();
    const useCase = new CalculateRouteUseCase(routingProvider);

    await expect(
      useCase.estimateTravelTimes({ ...request, destinations: [] }),
    ).resolves.toEqual([]);
    expect(routingProvider.estimateTravelTimes).not.toHaveBeenCalled();
  });
});
