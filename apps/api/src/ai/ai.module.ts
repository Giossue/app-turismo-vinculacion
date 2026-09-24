import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { CentersModule } from "../centers/centers.module";
import { EstablishmentsModule } from "../establishments/establishments.module";
import { PoisModule } from "../pois/pois.module";
import { TransportModule } from "../transport/transport.module";
import { RoutingModule } from "../routing/routing.module";
import { AdminModule } from "../admin/admin.module";
import { AiAgentController } from "./presentation/ai-agent.controller";
import { AiAgentService } from "./application/ai-agent.service";
import { AgentItinerariesService } from "./application/agent-itineraries.service";
import { AgentItinerariesController } from "./presentation/agent-itineraries.controller";
import { AgentHistoryService } from "./application/agent-history.service";
import { AgentHistoryController } from "./presentation/agent-history.controller";
import { AgentMediaService } from "./application/agent-media.service";
import { AgentMediaController } from "./presentation/agent-media.controller";
import { AgentEditorialService } from "./application/agent-editorial.service";
import { AgentEditorialController } from "./presentation/agent-editorial.controller";
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
    AdminModule,
  ],
  controllers: [
    AiAgentController,
    AgentItinerariesController,
    AgentHistoryController,
    AgentMediaController,
    AgentEditorialController,
  ],
  providers: [
    AiAgentService,
    AgentItinerariesService,
    AgentHistoryService,
    AgentMediaService,
    AgentEditorialService,
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
