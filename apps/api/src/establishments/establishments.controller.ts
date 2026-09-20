import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser, Roles } from "../auth/auth.decorators";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import type { AuthenticatedUser } from "../auth/auth.types";
import {
  AdminEstablishmentsQueryDto,
  PublicEstablishmentsQueryDto,
  SaveEstablishmentDto,
} from "./establishments.dto";
import { EstablishmentsService } from "./establishments.service";

@ApiTags("admin-establishments")
@ApiBearerAuth()
@Controller("admin/establishments")
@UseGuards(AuthGuard, RolesGuard)
export class AdminEstablishmentsController {
  constructor(private readonly establishments: EstablishmentsService) {}

  @Get()
  @Roles("ADMINISTRADOR")
  async list(@Query() query: AdminEstablishmentsQueryDto) {
    return { data: await this.establishments.list(query) };
  }

  @Get(":id")
  @Roles("ADMINISTRADOR")
  async find(@Param("id") id: string) {
    return { data: await this.establishments.find(id) };
  }

  @Post()
  @Roles("ADMINISTRADOR")
  async create(
    @Body() body: SaveEstablishmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { data: await this.establishments.create(user.id, body) };
  }

  @Patch(":id")
  @Roles("ADMINISTRADOR")
  async save(
    @Param("id") id: string,
    @Body() body: SaveEstablishmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { data: await this.establishments.save(id, user.id, body) };
  }

  @Post(":id/deactivate")
  @Roles("ADMINISTRADOR")
  async deactivate(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { data: await this.establishments.setActive(id, user.id, false) };
  }

  @Post(":id/reactivate")
  @Roles("ADMINISTRADOR")
  async reactivate(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { data: await this.establishments.setActive(id, user.id, true) };
  }
}

@ApiTags("establishments")
@Controller("establishments")
export class PublicEstablishmentsController {
  constructor(private readonly establishments: EstablishmentsService) {}

  @Get("nearby")
  async nearby(@Query() query: PublicEstablishmentsQueryDto) {
    return { data: await this.establishments.nearby(query) };
  }
}
