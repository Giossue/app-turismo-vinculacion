import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import {
  AdminOpinionsController,
  OpinionsController,
  PublicOpinionsController,
} from "./opinions.controller";
import { OpinionsService } from "./opinions.service";

@Module({
  imports: [AuthModule],
  controllers: [
    PublicOpinionsController,
    OpinionsController,
    AdminOpinionsController,
  ],
  providers: [OpinionsService],
})
export class OpinionsModule {}
