import { Controller, Get, Header, Inject, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";

import { AdminNavigationResponseDto } from "./admin-navigation.dto";
import { AdminNavigationService } from "./admin-navigation.service";
import { CurrentUser, Roles } from "../auth/auth.decorators";
import { AuthGuard } from "../auth/auth.guard";
import type { AuthenticatedUser } from "../auth/auth.types";
import { RolesGuard } from "../auth/roles.guard";

@ApiTags("admin-navigation")
@ApiBearerAuth()
@Controller("admin")
@UseGuards(AuthGuard, RolesGuard)
export class AdminNavigationController {
  constructor(
    @Inject(AdminNavigationService)
    private readonly navigation: AdminNavigationService,
  ) {}

  @Get("navigation-summary")
  @Header("Cache-Control", "private, no-store")
  @Roles("ADMINISTRADOR", "AGENTE_TURISTICO")
  @ApiOperation({
    summary: "Pendientes y últimas novedades de los apartados del panel",
    description:
      "Los agentes reciben únicamente las señales de sus centros y catastros.",
  })
  @ApiOkResponse({ type: AdminNavigationResponseDto })
  async summary(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AdminNavigationResponseDto> {
    return {
      data: await this.navigation.summary(
        user.id,
        user.roles.includes("ADMINISTRADOR"),
      ),
    };
  }
}
