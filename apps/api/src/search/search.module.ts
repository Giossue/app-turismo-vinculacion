import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import {
  PHOTON_FETCHER,
  PhotonClient,
} from "./infrastructure/photon.client";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";

@Module({
  imports: [ConfigModule],
  controllers: [SearchController],
  providers: [
    { provide: PHOTON_FETCHER, useValue: fetch },
    PhotonClient,
    SearchService,
  ],
})
export class SearchModule {}
