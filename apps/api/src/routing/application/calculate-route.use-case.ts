import type { RouteRequest } from "../domain/route";
import type { RoutingProvider } from "./routing-provider";

export class CalculateRouteUseCase {
  constructor(private readonly provider: RoutingProvider) {}

  execute(request: RouteRequest, signal?: AbortSignal) {
    return this.provider.calculate(request, signal);
  }
}
