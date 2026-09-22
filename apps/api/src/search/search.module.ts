import { Module } from "@nestjs/common";

import { PhotonClient } from "./infrastructure/photon.client";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";

@Module({
  controllers: [SearchController],
  providers: [PhotonClient, SearchService],
})
export class SearchModule {}
