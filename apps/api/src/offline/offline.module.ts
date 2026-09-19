import { Module } from "@nestjs/common";

import { GetOfflineCityManifestUseCase } from "./application/get-offline-city-manifest.use-case";
import { ListOfflineCitiesUseCase } from "./application/list-offline-cities.use-case";
import { OFFLINE_CITY_REPOSITORY } from "./application/offline-city.repository";
import { PostgresOfflineCityRepository } from "./infrastructure/postgres-offline-city.repository";
import { OfflineController } from "./presentation/offline.controller";

@Module({
  controllers: [OfflineController],
  providers: [
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
