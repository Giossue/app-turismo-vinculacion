import { Module } from "@nestjs/common";

import { CentersModule } from "../centers/centers.module";
import { AiAgentController } from "./presentation/ai-agent.controller";
import { AiAgentService } from "./application/ai-agent.service";

@Module({
  imports: [CentersModule],
  controllers: [AiAgentController],
  providers: [AiAgentService],
})
export class AiModule {}
