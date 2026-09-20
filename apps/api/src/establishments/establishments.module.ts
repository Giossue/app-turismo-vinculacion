import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import {
  AdminEstablishmentsController,
  PublicEstablishmentsController,
} from "./establishments.controller";
import { EstablishmentsService } from "./establishments.service";

@Module({
  imports: [AuthModule],
  controllers: [AdminEstablishmentsController, PublicEstablishmentsController],
  providers: [EstablishmentsService],
  exports: [EstablishmentsService],
})
export class EstablishmentsModule {}
