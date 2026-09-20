import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { CalculateRouteUseCase } from "./application/calculate-route.use-case";
import { ROUTING_PROVIDER } from "./application/routing-provider";
import { OsrmRoutingClient } from "./infrastructure/osrm-routing.client";
import { RoutingController } from "./presentation/routing.controller";

@Module({
  controllers: [RoutingController],
  providers: [
    {
      provide: OsrmRoutingClient,
      useFactory: (config: ConfigService) => new OsrmRoutingClient(config),
      inject: [ConfigService],
    },
    {
      provide: ROUTING_PROVIDER,
      useExisting: OsrmRoutingClient,
    },
    {
      provide: CalculateRouteUseCase,
      useFactory: (provider: OsrmRoutingClient) =>
        new CalculateRouteUseCase(provider),
      inject: [ROUTING_PROVIDER],
    },
  ],
})
export class RoutingModule {}
