import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { PlatformSettingsModule } from "../settings/platform-settings.module";
import {
  AdminEstablishmentsController,
  AppVersionController,
  DownloadPageController,
  EstablishmentQrPageController,
  PublicEstablishmentsController,
} from "./establishments.controller";
import { AppApkMirrorService } from "./app-apk-mirror.service";
import { AppReleaseService } from "./app-release.service";
import { EstablishmentsService } from "./establishments.service";
import { MinturRegistryImportService } from "./mintur-registry-import.service";

@Module({
  imports: [AuthModule, PlatformSettingsModule],
  controllers: [
    AdminEstablishmentsController,
    PublicEstablishmentsController,
    EstablishmentQrPageController,
    DownloadPageController,
    AppVersionController,
  ],
  providers: [
    AppApkMirrorService,
    AppReleaseService,
    EstablishmentsService,
    MinturRegistryImportService,
  ],
  exports: [EstablishmentsService],
})
export class EstablishmentsModule {}
