import { Module } from "@nestjs/common";

import { PUBLIC_TRANSPORT_REPOSITORY } from "./application/public-transport.repository";
import { PostgresPublicTransportRepository } from "./infrastructure/postgres-public-transport.repository";

@Module({
  providers: [
    PostgresPublicTransportRepository,
    {
      provide: PUBLIC_TRANSPORT_REPOSITORY,
      useExisting: PostgresPublicTransportRepository,
    },
  ],
  exports: [PUBLIC_TRANSPORT_REPOSITORY],
})
export class TransportModule {}
