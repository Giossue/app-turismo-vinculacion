import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { PlatformSettingsModule } from "../settings/platform-settings.module";
import {
  AdminEstablishmentsController,
  DownloadPageController,
  EstablishmentQrPageController,
  PublicEstablishmentsController,
} from "./establishments.controller";
import { EstablishmentsService } from "./establishments.service";
import { MinturRegistryImportService } from "./mintur-registry-import.service";

@Module({
  imports: [AuthModule, PlatformSettingsModule],
  controllers: [
    AdminEstablishmentsController,
    PublicEstablishmentsController,
    EstablishmentQrPageController,
    DownloadPageController,
  ],
  providers: [EstablishmentsService, MinturRegistryImportService],
  exports: [EstablishmentsService],
})
export class EstablishmentsModule {}
