import { Module } from "@nestjs/common";

import { PUBLIC_POI_REPOSITORY } from "./application/public-poi.repository";
import { PostgresPublicPoiRepository } from "./infrastructure/postgres-public-poi.repository";

@Module({
  providers: [
    PostgresPublicPoiRepository,
    {
      provide: PUBLIC_POI_REPOSITORY,
      useExisting: PostgresPublicPoiRepository,
    },
  ],
  exports: [PUBLIC_POI_REPOSITORY],
})
export class PoisModule {}
