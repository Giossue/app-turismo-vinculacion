import {
  maxTravelTimeDestinations,
  type RouteRequest,
  type TravelTimeEstimate,
  type TravelTimesRequest,
} from "../domain/route";
import type { RoutingProvider } from "./routing-provider";

export class CalculateRouteUseCase {
  constructor(private readonly provider: RoutingProvider) {}

  execute(request: RouteRequest, signal?: AbortSignal) {
    return this.provider.calculate(request, signal);
  }

  estimateTravelTimes(
    request: TravelTimesRequest,
    signal?: AbortSignal,
  ): Promise<readonly (readonly TravelTimeEstimate[])[]> {
    if (request.destinations.length > maxTravelTimeDestinations) {
      throw new RangeError(
        "Solo se pueden consultar seis destinos por solicitud.",
      );
    }
    if (request.destinations.length === 0) return Promise.resolve([]);
    return this.provider.estimateTravelTimes(request, signal);
  }
}
