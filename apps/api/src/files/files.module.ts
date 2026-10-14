import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { PlatformSettingsModule } from "../settings/platform-settings.module";
import { FilesController, PublicMediaController } from "./files.controller";
import { EstablishmentMediaService } from "./establishment-media.service";
import { MediaService } from "./media.service";
import { MediaStorageService } from "./media-storage.service";

@Module({
  imports: [AuthModule, PlatformSettingsModule],
  controllers: [FilesController, PublicMediaController],
  providers: [MediaStorageService, MediaService, EstablishmentMediaService],
  exports: [MediaService],
})
export class FilesModule {}
