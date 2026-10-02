import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { z } from "zod";

import {
  formatRouteInstruction,
  type RouteInstructionInput,
} from "../domain/route-instructions";
import {
  NoRouteFoundError,
  RouteProviderUnavailableError,
} from "../domain/routing-errors";
import {
  maxTravelTimeDestinations,
  travelTimeModes,
  type CalculatedRoute,
  type RouteMode,
  type RouteRequest,
  type TravelTimeEstimate,
  type TravelTimesRequest,
} from "../domain/route";
import type { RoutingProvider } from "../application/routing-provider";

const maneuverSchema = z
  .object({
    type: z.string(),
    modifier: z.string().nullable().optional(),
    exit: z.number().int().positive().nullable().optional(),
  })
  .passthrough();

const stepSchema = z
  .object({
    distance: z.number().finite(),
    duration: z.number().finite(),
    name: z.string().default(""),
    maneuver: maneuverSchema,
  })
  .passthrough();

const osrmResponseSchema = z.object({
  code: z.string(),
  routes: z.array(
    z.object({
      distance: z.number().finite(),
      duration: z.number().finite(),
      geometry: z.object({
        type: z.literal("LineString"),
        coordinates: z
          .array(z.tuple([z.number().finite(), z.number().finite()]))
          .min(2),
      }),
      legs: z.array(z.object({ steps: z.array(stepSchema).default([]) })),
    }),
  ),
});

const tableCellSchema = z.number().finite().nonnegative().nullable();
const osrmTableResponseSchema = z.object({
  code: z.literal("Ok"),
  durations: z.array(z.array(tableCellSchema)).length(1),
  distances: z.array(z.array(tableCellSchema)).length(1),
  fallback_speed_cells: z
    .array(z.tuple([z.number(), z.number()]))
    .max(0)
    .optional(),
});

const osrmStatusSchema = z.object({ code: z.string() });

const osrmProfileByMode: Record<RouteMode, string> = {
  car: "driving",
  bicycle: "cycling",
  foot: "walking",
};

@Injectable()
export class OsrmRoutingClient implements RoutingProvider {
  constructor(
    private readonly config: ConfigService,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async calculate(
    request: RouteRequest,
    signal?: AbortSignal,
  ): Promise<CalculatedRoute> {
    const baseUrl = this.getBaseUrl(request.mode);
    const coordinates = [request.origin, request.destination]
      .map(({ longitude, latitude }) => `${longitude},${latitude}`)
      .join(";");
    const url = new URL(
      `${baseUrl}/route/v1/${osrmProfileByMode[request.mode]}/${coordinates}`,
    );
    url.searchParams.set("overview", "full");
    url.searchParams.set("geometries", "geojson");
    url.searchParams.set("steps", "true");

    const controller = new AbortController();
    const abortFromCaller = () => controller.abort();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.getOrThrow<number>("ROUTING_REQUEST_TIMEOUT_MS"),
    );
    signal?.addEventListener("abort", abortFromCaller, { once: true });

    try {
      const response = await this.fetcher(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) throw new RouteProviderUnavailableError();

      const payload = osrmResponseSchema.safeParse(await response.json());
      if (!payload.success) throw new RouteProviderUnavailableError();
      if (
        payload.data.code === "NoRoute" ||
        payload.data.code === "NoSegment" ||
        payload.data.routes.length === 0
      ) {
        throw new NoRouteFoundError();
      }
      if (payload.data.code !== "Ok") {
        throw new RouteProviderUnavailableError();
      }

      const route = payload.data.routes[0];
      return {
        mode: request.mode,
        distanceMeters: route.distance,
        durationSeconds: route.duration,
        geometry: route.geometry,
        steps: route.legs.flatMap((leg) =>
          leg.steps.map((step) => {
            const instructionInput = {
              name: step.name,
              maneuver: step.maneuver,
            } satisfies RouteInstructionInput;
            return {
              instruction: formatRouteInstruction(instructionInput),
              distanceMeters: step.distance,
              durationSeconds: step.duration,
              name: step.name.trim() || null,
              maneuver: {
                type: step.maneuver.type,
                modifier: step.maneuver.modifier ?? null,
                exit: step.maneuver.exit ?? null,
              },
            };
          }),
        ),
      };
    } catch (error) {
      if (
        error instanceof NoRouteFoundError ||
        error instanceof RouteProviderUnavailableError
      ) {
        throw error;
      }
      throw new RouteProviderUnavailableError();
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abortFromCaller);
    }
  }

  async estimateTravelTimes(
    request: TravelTimesRequest,
    signal?: AbortSignal,
  ): Promise<readonly (readonly TravelTimeEstimate[])[]> {
    if (request.destinations.length > maxTravelTimeDestinations) {
      throw new RangeError(
        "Solo se pueden consultar seis destinos por solicitud.",
      );
    }
    if (request.destinations.length === 0) return [];

    const estimatesByMode = await Promise.all(
      travelTimeModes.map((mode) =>
        this.estimateTravelTimesByMode(request, mode, signal),
      ),
    );
    return request.destinations.map((_, destinationIndex) =>
      estimatesByMode.map((estimates) => estimates[destinationIndex]),
    );
  }

  private async estimateTravelTimesByMode(
    request: TravelTimesRequest,
    mode: RouteMode,
    signal?: AbortSignal,
  ): Promise<readonly TravelTimeEstimate[]> {
    const resultsWithStatus = (status: "no_route" | "unavailable") =>
      request.destinations.map(() => ({ mode, status }));
    const controller = new AbortController();
    const abortFromCaller = () => controller.abort();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    signal?.addEventListener("abort", abortFromCaller, { once: true });

    try {
      if (signal?.aborted) {
        controller.abort();
        return resultsWithStatus("unavailable");
      }
      timeout = setTimeout(
        () => controller.abort(),
        this.config.getOrThrow<number>("ROUTING_REQUEST_TIMEOUT_MS"),
      );
      const coordinates = [request.origin, ...request.destinations]
        .map(({ longitude, latitude }) => `${longitude},${latitude}`)
        .join(";");
      const url = new URL(
        `${this.getBaseUrl(mode)}/table/v1/${osrmProfileByMode[mode]}/${coordinates}`,
      );
      url.searchParams.set("sources", "0");
      url.searchParams.set(
        "destinations",
        request.destinations.map((_, index) => index + 1).join(";"),
      );
      url.searchParams.set("annotations", "duration,distance");

      const response = await this.fetcher(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      const rawPayload: unknown = await response.json();
      const status = osrmStatusSchema.safeParse(rawPayload);
      if (status.success && status.data.code === "NoTable") {
        return resultsWithStatus("no_route");
      }
      if (!response.ok) return resultsWithStatus("unavailable");

      const payload = osrmTableResponseSchema.safeParse(rawPayload);
      if (!payload.success) return resultsWithStatus("unavailable");
      const durations = payload.data.durations[0];
      const distances = payload.data.distances[0];
      if (
        durations.length !== request.destinations.length ||
        distances.length !== request.destinations.length
      ) {
        return resultsWithStatus("unavailable");
      }

      return durations.map((durationSeconds, index) => {
        const distanceMeters = distances[index];
        if (durationSeconds === null || distanceMeters === null) {
          return { mode, status: "no_route" };
        }
        return { mode, status: "available", durationSeconds, distanceMeters };
      });
    } catch {
      return resultsWithStatus("unavailable");
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abortFromCaller);
    }
  }

  private getBaseUrl(mode: RouteMode): string {
    const environmentKey = {
      car: "ROUTING_OSRM_CAR_URL",
      bicycle: "ROUTING_OSRM_BICYCLE_URL",
      foot: "ROUTING_OSRM_FOOT_URL",
    }[mode];
    return this.config.getOrThrow<string>(environmentKey).replace(/\/+$/, "");
  }
}
