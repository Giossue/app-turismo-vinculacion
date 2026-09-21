import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { CentersModule } from "../centers/centers.module";
import { EstablishmentsModule } from "../establishments/establishments.module";
import { AiAgentController } from "./presentation/ai-agent.controller";
import { AiAgentService } from "./application/ai-agent.service";
import { PUBLIC_ESTABLISHMENT_SEARCH } from "./application/public-establishment-search";
import { EstablishmentsPublicSearchAdapter } from "./infrastructure/establishments-public-search.adapter";

@Module({
  imports: [AuthModule, CentersModule, EstablishmentsModule],
  controllers: [AiAgentController],
  providers: [
    AiAgentService,
    EstablishmentsPublicSearchAdapter,
    {
      provide: PUBLIC_ESTABLISHMENT_SEARCH,
      useExisting: EstablishmentsPublicSearchAdapter,
    },
  ],
})
export class AiModule {}
