import { Module } from "@nestjs/common";

import { CentersModule } from "../centers/centers.module";
import { EstablishmentsModule } from "../establishments/establishments.module";
import { NearbyController } from "./nearby.controller";
import { NearbyService } from "./nearby.service";

@Module({
  imports: [CentersModule, EstablishmentsModule],
  controllers: [NearbyController],
  providers: [NearbyService],
})
export class NearbyModule {}
