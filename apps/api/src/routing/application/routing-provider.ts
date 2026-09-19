import type { CalculatedRoute, RouteRequest } from "../domain/route";

export const ROUTING_PROVIDER = Symbol("ROUTING_PROVIDER");

export interface RoutingProvider {
  calculate(
    request: RouteRequest,
    signal?: AbortSignal,
  ): Promise<CalculatedRoute>;
}
