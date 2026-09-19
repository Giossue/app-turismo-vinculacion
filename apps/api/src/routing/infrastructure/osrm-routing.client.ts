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
import type { CalculatedRoute, RouteMode, RouteRequest } from "../domain/route";
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

  private getBaseUrl(mode: RouteMode): string {
    const environmentKey = {
      car: "ROUTING_OSRM_CAR_URL",
      bicycle: "ROUTING_OSRM_BICYCLE_URL",
      foot: "ROUTING_OSRM_FOOT_URL",
    }[mode];
    return this.config.getOrThrow<string>(environmentKey).replace(/\/+$/, "");
  }
}
