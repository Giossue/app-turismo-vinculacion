import "reflect-metadata";

import { ConfigService } from "@nestjs/config";
import { describe, expect, it, vi } from "vitest";

import { OsrmRoutingClient } from "../src/routing/infrastructure/osrm-routing.client";
import type { TravelTimesRequest } from "../src/routing/domain/route";

describe("OsrmRoutingClient", () => {
  it("declares ConfigService for Nest dependency injection", () => {
    const parameterTypes = Reflect.getMetadata(
      "design:paramtypes",
      OsrmRoutingClient,
    ) as unknown[] | undefined;

    expect(parameterTypes?.[0]).toBe(ConfigService);
  });

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

const travelTimesRequest: TravelTimesRequest = {
  origin: { latitude: -1.593, longitude: -79.001 },
  destinations: [
    { latitude: -1.594, longitude: -79 },
    { latitude: -1.595, longitude: -79.002 },
  ],
};

function travelTimesConfig(timeoutMilliseconds = 8_000) {
  return new ConfigService({
    ROUTING_OSRM_CAR_URL: "http://osrm-car:5000/",
    ROUTING_OSRM_FOOT_URL: "http://osrm-foot:5000",
    ROUTING_OSRM_BICYCLE_URL: "http://osrm-bicycle:5000",
    ROUTING_REQUEST_TIMEOUT_MS: timeoutMilliseconds,
  });
}

function tableResponse(payload: unknown, ok = true) {
  return { ok, json: async () => payload };
}

describe("OsrmRoutingClient travel time estimates", () => {
  it("requests the three route profiles concurrently and preserves destinations and modes", async () => {
    const finishRequests: (() => void)[] = [];
    const fetcher = vi.fn().mockImplementation(
      (url: URL) =>
        new Promise((resolve) => {
          const duration = url.hostname === "osrm-car" ? 120 : 480;
          finishRequests.push(() =>
            resolve(
              tableResponse({
                code: "Ok",
                durations: [[duration, duration + 60]],
                distances: [[846, 1000]],
              }),
            ),
          );
        }),
    );
    const client = new OsrmRoutingClient(travelTimesConfig(), fetcher);
    const pending = client.estimateTravelTimes(travelTimesRequest);

    expect(fetcher).toHaveBeenCalledTimes(3);
    const profiles = ["driving", "walking", "cycling"];
    fetcher.mock.calls.forEach(([url, options], index) => {
      const requestUrl = url as URL;
      expect(requestUrl.pathname).toBe(
        `/table/v1/${profiles[index]}/-79.001,-1.593;-79,-1.594;-79.002,-1.595`,
      );
      expect(requestUrl.searchParams.get("sources")).toBe("0");
      expect(requestUrl.searchParams.get("destinations")).toBe("1;2");
      expect(requestUrl.searchParams.get("annotations")).toBe(
        "duration,distance",
      );
      expect(requestUrl.searchParams.has("fallback_speed")).toBe(false);
      expect((options as RequestInit).signal).toBeInstanceOf(AbortSignal);
    });
    finishRequests.reverse().forEach((finish) => finish());

    await expect(pending).resolves.toEqual([
      [
        {
          mode: "car",
          status: "available",
          durationSeconds: 120,
          distanceMeters: 846,
        },
        {
          mode: "foot",
          status: "available",
          durationSeconds: 480,
          distanceMeters: 846,
        },
        {
          mode: "bicycle",
          status: "available",
          durationSeconds: 480,
          distanceMeters: 846,
        },
      ],
      [
        {
          mode: "car",
          status: "available",
          durationSeconds: 180,
          distanceMeters: 1000,
        },
        {
          mode: "foot",
          status: "available",
          durationSeconds: 540,
          distanceMeters: 1000,
        },
        {
          mode: "bicycle",
          status: "available",
          durationSeconds: 540,
          distanceMeters: 1000,
        },
      ],
    ]);
  });

  it("keeps available profiles when one provider fails and treats null as no route", async () => {
    const fetcher = vi.fn().mockImplementation(async (url: URL) => {
      if (url.hostname === "osrm-car")
        throw new Error("private provider failed");
      return tableResponse({
        code: "Ok",
        durations: [[120, null]],
        distances: [[846, null]],
      });
    });
    const client = new OsrmRoutingClient(travelTimesConfig(), fetcher);

    await expect(
      client.estimateTravelTimes(travelTimesRequest),
    ).resolves.toEqual([
      [
        { mode: "car", status: "unavailable" },
        {
          mode: "foot",
          status: "available",
          durationSeconds: 120,
          distanceMeters: 846,
        },
        {
          mode: "bicycle",
          status: "available",
          durationSeconds: 120,
          distanceMeters: 846,
        },
      ],
      [
        { mode: "car", status: "unavailable" },
        { mode: "foot", status: "no_route" },
        { mode: "bicycle", status: "no_route" },
      ],
    ]);
  });

  it("recognizes NoTable without requiring successful response matrices", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(tableResponse({ code: "NoTable" }, false));
    const client = new OsrmRoutingClient(travelTimesConfig(), fetcher);

    await expect(
      client.estimateTravelTimes(travelTimesRequest),
    ).resolves.toEqual([
      [
        { mode: "car", status: "no_route" },
        { mode: "foot", status: "no_route" },
        { mode: "bicycle", status: "no_route" },
      ],
      [
        { mode: "car", status: "no_route" },
        { mode: "foot", status: "no_route" },
        { mode: "bicycle", status: "no_route" },
      ],
    ]);
  });

  it.each([
    { code: "NotImplemented" },
    { code: "NoSegment" },
    { code: "Ok", durations: [[120]], distances: [[846, 1000]] },
    { code: "Ok", durations: [[120, 180]], distances: [[846]] },
    {
      code: "Ok",
      durations: [
        [120, 180],
        [120, 180],
      ],
      distances: [[846, 1000]],
    },
    {
      code: "Ok",
      durations: [[120, 180]],
      distances: [
        [846, 1000],
        [846, 1000],
      ],
    },
    { code: "Ok", durations: [[-1, 180]], distances: [[846, 1000]] },
    { code: "Ok", durations: [[Infinity, 180]], distances: [[846, 1000]] },
    { code: "Ok", durations: [[120, 180]], distances: [[NaN, 1000]] },
    { code: "Ok", durations: [[120, 180]], distances: [[846, -1]] },
    {
      code: "Ok",
      durations: [[120, 180]],
      distances: [[846, 1000]],
      fallback_speed_cells: [[0, 0]],
    },
  ])("rejects unsupported or invalid route tables: %j", async (payload) => {
    const fetcher = vi.fn().mockResolvedValue(tableResponse(payload));
    const client = new OsrmRoutingClient(travelTimesConfig(), fetcher);
    const result = await client.estimateTravelTimes(travelTimesRequest);

    expect(result).toHaveLength(2);
    expect(
      result.flat().every((estimate) => estimate.status === "unavailable"),
    ).toBe(true);
  });

  it("accepts zero duration and distance for matching points", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      tableResponse({
        code: "Ok",
        durations: [[0, 180]],
        distances: [[0, 1000]],
      }),
    );
    const client = new OsrmRoutingClient(travelTimesConfig(), fetcher);

    expect(
      (await client.estimateTravelTimes(travelTimesRequest))[0][0],
    ).toEqual({
      mode: "car",
      status: "available",
      durationSeconds: 0,
      distanceMeters: 0,
    });
  });

  it("stops all requests when the caller aborts and removes its listeners", async () => {
    const fetcher = vi.fn().mockImplementation(
      (_url: URL, options: RequestInit) =>
        new Promise((_resolve, reject) => {
          options.signal?.addEventListener(
            "abort",
            () => reject(new Error("aborted")),
            { once: true },
          );
        }),
    );
    const caller = new AbortController();
    const removeListener = vi.spyOn(caller.signal, "removeEventListener");
    const client = new OsrmRoutingClient(travelTimesConfig(), fetcher);
    const pending = client.estimateTravelTimes(
      travelTimesRequest,
      caller.signal,
    );

    caller.abort();
    expect(
      (await pending)
        .flat()
        .every((estimate) => estimate.status === "unavailable"),
    ).toBe(true);
    expect(removeListener).toHaveBeenCalledTimes(3);
    expect(
      fetcher.mock.calls.every(
        ([, options]) => (options as RequestInit).signal?.aborted,
      ),
    ).toBe(true);
  });

  it("makes no requests if the caller was already aborted", async () => {
    const fetcher = vi.fn();
    const caller = new AbortController();
    caller.abort();
    const client = new OsrmRoutingClient(travelTimesConfig(), fetcher);

    expect(
      (await client.estimateTravelTimes(travelTimesRequest, caller.signal))
        .flat()
        .every((estimate) => estimate.status === "unavailable"),
    ).toBe(true);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("bounds each profile request by the routing timeout", async () => {
    vi.useFakeTimers();
    try {
      const fetcher = vi.fn().mockImplementation(
        (_url: URL, options: RequestInit) =>
          new Promise((_resolve, reject) => {
            options.signal?.addEventListener(
              "abort",
              () => reject(new Error("timeout")),
              { once: true },
            );
          }),
      );
      const client = new OsrmRoutingClient(travelTimesConfig(100), fetcher);
      const pending = client.estimateTravelTimes(travelTimesRequest);

      await vi.advanceTimersByTimeAsync(100);
      expect(
        (await pending)
          .flat()
          .every((estimate) => estimate.status === "unavailable"),
      ).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("handles a missing profile configuration without discarding configured modes", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      tableResponse({
        code: "Ok",
        durations: [[120, 180]],
        distances: [[846, 1000]],
      }),
    );
    const config = travelTimesConfig();
    config.set("ROUTING_OSRM_FOOT_URL", undefined);
    const client = new OsrmRoutingClient(config, fetcher);
    const result = await client.estimateTravelTimes(travelTimesRequest);

    expect(result[0].map(({ status }) => status)).toEqual([
      "available",
      "unavailable",
      "available",
    ]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("limits destinations to six and skips empty requests", async () => {
    const fetcher = vi.fn();
    const client = new OsrmRoutingClient(travelTimesConfig(), fetcher);

    await expect(
      client.estimateTravelTimes({
        ...travelTimesRequest,
        destinations: Array.from(
          { length: 7 },
          () => travelTimesRequest.destinations[0],
        ),
      }),
    ).rejects.toThrow("seis destinos");
    await expect(
      client.estimateTravelTimes({ ...travelTimesRequest, destinations: [] }),
    ).resolves.toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
