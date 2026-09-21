import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { CentersModule } from "../centers/centers.module";
import { EstablishmentsModule } from "../establishments/establishments.module";
import { PoisModule } from "../pois/pois.module";
import { TransportModule } from "../transport/transport.module";
import { RoutingModule } from "../routing/routing.module";
import { AiAgentController } from "./presentation/ai-agent.controller";
import { AiAgentService } from "./application/ai-agent.service";
import { PUBLIC_ESTABLISHMENT_SEARCH } from "./application/public-establishment-search";
import { EstablishmentsPublicSearchAdapter } from "./infrastructure/establishments-public-search.adapter";
import { EstablishmentsPublicNearbySearchAdapter } from "./infrastructure/establishments-public-nearby-search.adapter";
import { PUBLIC_NEARBY_ESTABLISHMENT_SEARCH } from "./application/public-nearby-establishment-search";

@Module({
  imports: [
    AuthModule,
    CentersModule,
    EstablishmentsModule,
    PoisModule,
    TransportModule,
    RoutingModule,
  ],
  controllers: [AiAgentController],
  providers: [
    AiAgentService,
    EstablishmentsPublicSearchAdapter,
    EstablishmentsPublicNearbySearchAdapter,
    {
      provide: PUBLIC_ESTABLISHMENT_SEARCH,
      useExisting: EstablishmentsPublicSearchAdapter,
    },
    {
      provide: PUBLIC_NEARBY_ESTABLISHMENT_SEARCH,
      useExisting: EstablishmentsPublicNearbySearchAdapter,
    },
  ],
})
export class AiModule {}
