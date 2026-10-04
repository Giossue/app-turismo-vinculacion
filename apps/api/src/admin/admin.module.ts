import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { FilesModule } from "../files/files.module";
import { AdminCentersService } from "./admin-centers.service";
import { AdminUsersService } from "./admin-users.service";
import { AdminController } from "./admin.controller";
import { AdminNavigationController } from "./admin-navigation.controller";
import { AdminNavigationService } from "./admin-navigation.service";

@Module({
  imports: [AuthModule, FilesModule],
  controllers: [AdminController, AdminNavigationController],
  providers: [AdminCentersService, AdminNavigationService, AdminUsersService],
  exports: [AdminCentersService],
})
export class AdminModule {}
