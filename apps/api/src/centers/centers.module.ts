import { Module } from "@nestjs/common";

import { GetPublishedCenterUseCase } from "./application/get-published-center.use-case";
import { GetDiscoveryCatalogUseCase } from "./application/get-discovery-catalog.use-case";
import { ListPublishedCentersUseCase } from "./application/list-published-centers.use-case";
import { PUBLIC_CENTER_REPOSITORY } from "./application/public-center.repository";
import { PostgresPublicCenterRepository } from "./infrastructure/postgres-public-center.repository";
import { CentersPublicController } from "./presentation/centers-public.controller";

@Module({
  controllers: [CentersPublicController],
  providers: [
    PostgresPublicCenterRepository,
    {
      provide: PUBLIC_CENTER_REPOSITORY,
      useExisting: PostgresPublicCenterRepository,
    },
    {
      provide: ListPublishedCentersUseCase,
      useFactory: (repository: PostgresPublicCenterRepository) =>
        new ListPublishedCentersUseCase(repository),
      inject: [PUBLIC_CENTER_REPOSITORY],
    },
    {
      provide: GetPublishedCenterUseCase,
      useFactory: (repository: PostgresPublicCenterRepository) =>
        new GetPublishedCenterUseCase(repository),
      inject: [PUBLIC_CENTER_REPOSITORY],
    },
    {
      provide: GetDiscoveryCatalogUseCase,
      useFactory: (repository: PostgresPublicCenterRepository) =>
        new GetDiscoveryCatalogUseCase(repository),
      inject: [PUBLIC_CENTER_REPOSITORY],
    },
  ],
  exports: [PUBLIC_CENTER_REPOSITORY],
})
export class CentersModule {}
