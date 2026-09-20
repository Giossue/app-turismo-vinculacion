import { Controller, Delete, Get, Param, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser, Roles } from "../auth/auth.decorators";
import { AuthGuard } from "../auth/auth.guard";
import type { AuthenticatedUser } from "../auth/auth.types";
import { RolesGuard } from "../auth/roles.guard";
import { FavoritesService } from "./favorites.service";

@ApiTags("favorites")
@ApiBearerAuth()
@Controller("favorites")
@UseGuards(AuthGuard, RolesGuard)
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  @Get("centers")
  @Roles("TURISTA", "ADMINISTRADOR")
  async listCenters(@CurrentUser() user: AuthenticatedUser) {
    return { data: await this.favorites.listCenters(user.id) };
  }

  @Put("centers/:code")
  @Roles("TURISTA", "ADMINISTRADOR")
  async addCenter(
    @Param("code") code: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { data: await this.favorites.addCenter(user.id, code) };
  }

  @Delete("centers/:code")
  @Roles("TURISTA", "ADMINISTRADOR")
  async removeCenter(
    @Param("code") code: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { data: await this.favorites.removeCenter(user.id, code) };
  }
}
