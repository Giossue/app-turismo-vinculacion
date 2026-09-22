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
  CreateEstablishmentDto,
  PublicEstablishmentsMapQueryDto,
  PublicEstablishmentsQueryDto,
  ReviewEstablishmentDto,
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
  @Roles("ADMINISTRADOR", "AGENTE_TURISTICO")
  async list(
    @Query() query: AdminEstablishmentsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      data: await this.establishments.list(
        query,
        user.id,
        user.roles.includes("ADMINISTRADOR"),
      ),
    };
  }

  @Get(":id/audit")
  @Roles("ADMINISTRADOR")
  async audit(@Param("id") id: string) {
    return { data: await this.establishments.getAudit(id) };
  }

  @Get(":id")
  @Roles("ADMINISTRADOR", "AGENTE_TURISTICO")
  async find(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return {
      data: await this.establishments.find(
        id,
        user.id,
        user.roles.includes("ADMINISTRADOR"),
      ),
    };
  }

  @Post()
  @Roles("ADMINISTRADOR", "AGENTE_TURISTICO")
  async create(
    @Body() body: CreateEstablishmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      data: await this.establishments.create(
        user.id,
        body,
        user.roles.includes("ADMINISTRADOR"),
      ),
    };
  }

  @Patch(":id")
  @Roles("ADMINISTRADOR", "AGENTE_TURISTICO")
  async save(
    @Param("id") id: string,
    @Body() body: SaveEstablishmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      data: await this.establishments.save(
        id,
        user.id,
        body,
        user.roles.includes("ADMINISTRADOR"),
      ),
    };
  }

  @Post(":id/submit-review")
  @Roles("ADMINISTRADOR", "AGENTE_TURISTICO")
  async submitReview(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      data: await this.establishments.submitReview(
        id,
        user.id,
        user.roles.includes("ADMINISTRADOR"),
      ),
    };
  }

  @Patch(":id/review")
  @Roles("ADMINISTRADOR")
  async review(
    @Param("id") id: string,
    @Body() body: ReviewEstablishmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { data: await this.establishments.review(id, user.id, body) };
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

  @Get("map")
  async map(@Query() query: PublicEstablishmentsMapQueryDto) {
    return { data: await this.establishments.map(query) };
  }

  @Get("nearby")
  async nearby(@Query() query: PublicEstablishmentsQueryDto) {
    return { data: await this.establishments.nearby(query) };
  }
}
