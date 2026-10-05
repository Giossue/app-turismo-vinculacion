import {
  Controller,
  Get,
  Header,
  Inject,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { AdminActivityService } from "./admin-activity.service";
import { AdminActivityQueryDto } from "./admin.dto";
import { Roles } from "../auth/auth.decorators";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";

@ApiTags("admin-activity")
@ApiBearerAuth()
@Controller("admin")
@UseGuards(AuthGuard, RolesGuard)
export class AdminActivityController {
  constructor(
    @Inject(AdminActivityService)
    private readonly activity: AdminActivityService,
  ) {}

  @Get("activity")
  @Header("Cache-Control", "private, no-store")
  @Roles("ADMINISTRADOR")
  @ApiOperation({
    summary: "Consulta la actividad administrativa",
    description:
      "Lista eventos de auditoría de fichas, catastros, catálogos y moderación de opiniones.",
  })
  async list(@Query() query: AdminActivityQueryDto) {
    return { data: await this.activity.list(query) };
  }
}
