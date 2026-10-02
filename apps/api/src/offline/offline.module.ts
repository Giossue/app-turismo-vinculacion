import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { GetOfflineCityManifestUseCase } from "./application/get-offline-city-manifest.use-case";
import { ListOfflineCitiesUseCase } from "./application/list-offline-cities.use-case";
import { OFFLINE_CITY_REPOSITORY } from "./application/offline-city.repository";
import { PostgresOfflineCityRepository } from "./infrastructure/postgres-offline-city.repository";
import { OfflineController } from "./presentation/offline.controller";
import { OfflineMapStyleController } from "./presentation/offline-map-style.controller";
import {
  OFFLINE_MAP_STYLE_FETCHER,
  OfflineMapStyleService,
} from "./infrastructure/offline-map-style.service";

@Module({
  imports: [ConfigModule],
  controllers: [OfflineController, OfflineMapStyleController],
  providers: [
    { provide: OFFLINE_MAP_STYLE_FETCHER, useValue: fetch },
    OfflineMapStyleService,
    PostgresOfflineCityRepository,
    {
      provide: OFFLINE_CITY_REPOSITORY,
      useExisting: PostgresOfflineCityRepository,
    },
    {
      provide: ListOfflineCitiesUseCase,
      useFactory: (repository: PostgresOfflineCityRepository) =>
        new ListOfflineCitiesUseCase(repository),
      inject: [OFFLINE_CITY_REPOSITORY],
    },
    {
      provide: GetOfflineCityManifestUseCase,
      useFactory: (repository: PostgresOfflineCityRepository) =>
        new GetOfflineCityManifestUseCase(repository),
      inject: [OFFLINE_CITY_REPOSITORY],
    },
  ],
})
export class OfflineModule {}
