import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import {
  AdminEstablishmentsController,
  PublicEstablishmentsController,
} from "./establishments.controller";
import { EstablishmentsService } from "./establishments.service";
import { MinturRegistryImportService } from "./mintur-registry-import.service";

@Module({
  imports: [AuthModule],
  controllers: [AdminEstablishmentsController, PublicEstablishmentsController],
  providers: [EstablishmentsService, MinturRegistryImportService],
  exports: [EstablishmentsService],
})
export class EstablishmentsModule {}
