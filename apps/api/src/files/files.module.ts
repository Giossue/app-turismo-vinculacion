import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { FilesController, PublicMediaController } from "./files.controller";
import { MediaService } from "./media.service";
import { MediaStorageService } from "./media-storage.service";

@Module({
  imports: [AuthModule],
  controllers: [FilesController, PublicMediaController],
  providers: [MediaStorageService, MediaService],
  exports: [MediaService],
})
export class FilesModule {}
