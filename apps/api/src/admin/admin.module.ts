import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { FilesModule } from "../files/files.module";
import { AdminCentersService } from "./admin-centers.service";
import { AdminController } from "./admin.controller";

@Module({
  imports: [AuthModule, FilesModule],
  controllers: [AdminController],
  providers: [AdminCentersService],
})
export class AdminModule {}
